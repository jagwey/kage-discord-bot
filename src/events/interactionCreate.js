import { Events } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { ryoEkle } from '../services/ekonomiServisi.js';
import { kayitModaliOlustur, kayitIsleminiTamamla } from '../services/kayitServisi.js';

export const name = Events.InteractionCreate;

/**
 * Kullanıcı etkileşimlerini (Slash Komutları, Butonlar & Autocomplete) karşılar
 * @param {import('discord.js').Interaction} interaction
 */
export async function execute(interaction) {
  // 1. Autocomplete (Otomatik tamamlama) etkileşimi
  if (interaction.isAutocomplete()) {
    const komut = interaction.client.commands.get(interaction.commandName);
    if (!komut || !komut.autocomplete) return;

    try {
      await komut.autocomplete(interaction);
    } catch (err) {
      console.error(`[InteractionCreate] Autocomplete (${interaction.commandName}) hatası:`, err.message);
    }
    return;
  }

  // 2. Buton Tıklamaları (Kayıt Ol & Profil Güncelleme)
  if (interaction.isButton()) {
    if (interaction.customId === 'kage_kayit_ol_btn' || interaction.customId === 'kage_profil_guncelle_btn') {
      const modal = kayitModaliOlustur({
        isim: interaction.member?.displayName?.replace(/[🌸🗡️]/g, '').trim()
      });
      return interaction.showModal(modal).catch(err => {
        console.error('[InteractionCreate] Modal açma hatası:', err.message);
      });
    }
  }

  // 3. Modal Form Gönderimleri (Detaylı Kayıt İşlemi)
  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'kage_kayit_modal') {
      await interaction.deferReply({ ephemeral: true });

      const isimYas = interaction.fields.getTextInputValue('kayit_isim_yas');
      const cinsiyet = interaction.fields.getTextInputValue('kayit_cinsiyet');
      const mangaTuru = interaction.fields.getTextInputValue('kayit_manga_turu') || 'Genel';
      const yemin = interaction.fields.getTextInputValue('kayit_yemin') || 'Kage Kalesi Onuru';

      try {
        const { embed, files } = await kayitIsleminiTamamla(interaction, {
          hedefUye: interaction.member,
          isimYas,
          cinsiyet,
          mangaTuru,
          yemin
        });

        return interaction.editReply({
          embeds: [embed],
          files
        });
      } catch (err) {
        console.error('[InteractionCreate] Kayıt tamamlama hatası:', err.message);
        return interaction.editReply({
          content: `❌ Kayıt tamamlanırken bir hata oluştu: ${err.message}`
        });
      }
    }
  }

  // 4. ChatInputCommand (Eğik çizgi komutu) etkileşimi
  if (interaction.isChatInputCommand()) {
    const komut = interaction.client.commands.get(interaction.commandName);

    if (!komut) {
      console.warn(`[InteractionCreate] Tanımlanmamış komut tetiklendi: ${interaction.commandName}`);
      return;
    }

    try {
      await komut.execute(interaction);
    } catch (err) {
      console.error(`[InteractionCreate] /${interaction.commandName} komutunda hata:`, err);

      const hataEmbed = kageEmbed({
        baslik: 'Gölge Hatası',
        renk: TEMA.RENKLER.HATA,
        aciklama: `${TEMA.EMOJILER.KATANA} Bu komut yürütülürken beklenmedik bir gölge sisi ortaya çıktı.\n\`\`\`${err.message}\`\`\``
      });

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [hataEmbed], ephemeral: true }).catch(() => null);
      } else {
        await interaction.reply({ embeds: [hataEmbed], ephemeral: true }).catch(() => null);
      }
    }
  }
}
