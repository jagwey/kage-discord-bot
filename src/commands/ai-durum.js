import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { saglayiciDurumu, aiIstatistik } from '../services/aiRouterServisi.js';

export const data = new SlashCommandBuilder()
  .setName('ai-durum')
  .setDescription('Yapay zeka sağlayıcılarının anahtar durumunu ve başarı/hata sayılarını göster.')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  const durum = saglayiciDurumu();
  const ist = aiIstatistik();
  const adlar = { gemini: 'Gemini', groq: 'Groq', openrouter: 'OpenRouter', pollinations: 'Pollinations' };
  const alanlar = Object.entries(adlar).map(([id, ad]) => {
    const s = ist[id] || { basari: 0, hata: 0, sonHata: '' };
    const sonHata = s.sonHata ? `\nSon hata: ${s.sonHata.slice(0, 120)}` : '';
    return {
      name: `${durum[id] ? '🟢' : '🔴'} ${ad}`,
      value: `${durum[id] ? 'Anahtar var' : 'Anahtar yok'}\nBaşarı: ${s.basari} • Hata: ${s.hata}${sonHata}`,
      inline: true
    };
  });
  const embed = kageEmbed({
    baslik: 'YAPAY ZEKA DURUMU',
    renk: TEMA.RENKLER.ALTIN,
    aciklama: 'Sayaçlar bot yeniden başlayınca sıfırlanır.',
    alanlar
  });
  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
