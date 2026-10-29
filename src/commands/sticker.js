import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { STICKER_DUYGULARI } from '../services/egitimServisi.js';

export const data = new SlashCommandBuilder()
  .setName('sticker')
  .setDescription('Kage stickerlarını göster.')
  .addStringOption(o => o.setName('duygu').setDescription('Tek bir sticker (boş bırakırsan hepsi).')
    .addChoices(...STICKER_DUYGULARI.map(d => ({ name: d, value: d }))))
  .addStringOption(o => o.setName('tur').setDescription('Hangi Kage? (varsayılan: ikisi de)')
    .addChoices({ name: 'Kage (erkek)', value: 'erkek' }, { name: 'Kunoichi (kadın)', value: 'kunoichi' }));

const KLASOR = path.resolve('assets', 'stickers');

function dosyalar(klasor, ek, duygular) {
  return duygular
    .map(d => ({ d, yol: path.join(klasor, `kage_${d}.png`) }))
    .filter(x => fs.existsSync(x.yol))
    .map(x => new AttachmentBuilder(x.yol, { name: `${ek}${x.d}.png` }));
}

export async function execute(interaction) {
  await interaction.deferReply();
  const duygu = interaction.options.getString('duygu');
  const tur = interaction.options.getString('tur');
  const duygular = duygu ? [duygu] : STICKER_DUYGULARI;
  const gruplar = [];
  if (tur !== 'kunoichi') gruplar.push({ baslik: '🥷 **Kage**', files: dosyalar(KLASOR, 'kage_', duygular) });
  if (tur !== 'erkek') gruplar.push({ baslik: '🌸 **Kunoichi**', files: dosyalar(path.join(KLASOR, 'kunoichi'), 'kunoichi_', duygular) });

  const dolu = gruplar.filter(g => g.files.length);
  if (!dolu.length) return interaction.editReply({ content: '❌ Sticker dosyası bulunamadı.' });

  await interaction.editReply({ content: `${dolu[0].baslik} • ${duygular.join(', ')}`, files: dolu[0].files });
  for (const g of dolu.slice(1)) await interaction.followUp({ content: g.baslik, files: g.files });
}
