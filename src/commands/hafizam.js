import { SlashCommandBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { kullaniciHafizasiGetir, profilGetir } from '../services/kageHafizaServisi.js';
import { bakiyeGetir, KILIC_SEVIYELERI } from '../services/ekonomiServisi.js';
import { kullaniciKayitBilgileriniGetir } from '../services/kayitServisi.js';
import { kullaniciKizMi } from '../services/chatBotServisi.js';

export const data = new SlashCommandBuilder()
  .setName('hafizam')
  .setDescription('Kage\'nin derin hafızasında senin hakkında bildiği her şeyi parşömen olarak gösterir.');

export async function execute(interaction) {
  const user = interaction.user;
  const member = interaction.member;

  const hafizaNotu = kullaniciHafizasiGetir(user.id);
  const profil = profilGetir(user.id);
  const kayit = kullaniciKayitBilgileriniGetir(user.id, member);
  const { ryo, kilicSeviye } = bakiyeGetir(user.id);
  const kilic = KILIC_SEVIYELERI[kilicSeviye] || KILIC_SEVIYELERI[1];
  const isFemale = kullaniciKizMi(user, member);

  const notlarListesi = hafizaNotu?.notlar?.length
    ? hafizaNotu.notlar.map(n => `• ${n}`).join('\n')
    : 'Henüz özel bir not kaydedilmedi. Sohbet ettikçe seni tanıyorum!';

  const ilgiAlanlari = profil?.ilgiAlanlari?.length ? profil.ilgiAlanlari.join(', ') : 'Belirtilmedi';
  const favoriMangalar = profil?.favoriMangalar?.length ? profil.favoriMangalar.join(', ') : 'Henüz söylenmedi';
  const kisaOzet = profil?.kisaOzet || 'Sadık ve onurlu bir Kage Kalesi savaşçısı.';

  const embed = kageEmbed({
    baslik: isFemale ? '🌸 KUNOICHI HAFIZA PARŞÖMENİ' : '⛩️ SAMURAY HAFIZA PARŞÖMENİ',
    renk: isFemale ? 0xFF66B2 : TEMA.RENKLER.ALTIN,
    aciklama: `**${user.username}**, Kage Kalesi'nin derin hafıza bankasında (\`data/kage_hafiza.json\`) senin hakkında tutulan kadim kayıtlar aşağıdadır:\n\n` +
      `📜 **Hakkında Özet:** *"${kisaOzet}"*`,
    alanlar: [
      {
        name: '👤 Savaşçı Kimliği',
        value: `**Hitap:** ${isFemale ? 'Kunoichi 🌸' : 'Samuray 🗡️'}\n` +
          `**Kılıç:** ${kilic.ad} (+%${kilic.hasarBonusu})\n` +
          `**Hazine:** ${ryo.toLocaleString('tr-TR')} Ryo\n` +
          `**Ruh Karakteri:** ${kayit?.karakter || 'Bilinmiyor'}`,
        inline: true
      },
      {
        name: '🎨 İlgi & Zevkler',
        value: `**Favori Seriler:** ${favoriMangalar}\n` +
          `**İlgi Alanları:** ${ilgiAlanlari}\n` +
          `**Favori Manga Türü:** ${kayit?.mangaTuru || 'Genel'}`,
        inline: true
      },
      {
        name: '🧠 Kage\'nin Hatırladığı Kişisel Anılar & Notlar',
        value: notlarListesi.length > 1000 ? notlarListesi.slice(0, 990) + '...' : notlarListesi,
        inline: false
      }
    ],
    altMetin: `Son Hafıza Senkronu: ${hafizaNotu?.sonGuncelleme ? new Date(hafizaNotu.sonGuncelleme).toLocaleString('tr-TR') : 'Bugün'}`
  });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ai_sil_${user.id}`)
      .setLabel('Hafızamı Sıfırla')
      .setEmoji('🗑️')
      .setStyle(ButtonStyle.Danger)
  );

  return interaction.reply({ embeds: [embed], components: [row], flags: MessageFlags.Ephemeral });
}
