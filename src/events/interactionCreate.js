import { Events } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { ryoEkle } from '../services/ekonomiServisi.js';

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

  // 2. Buton Tıklamaları (Button Interaction)
  if (interaction.isButton()) {
    // A. Kayıt Ol Butonu
    if (interaction.customId === 'kage_kayit_ol_btn') {
      const guild = interaction.guild;
      const member = interaction.member;

      const kayitliRol = guild.roles.cache.find(r => r.name.includes('Shinobi') || r.name.includes('Kayıtlı') || r.name.includes('Üye'));
      const kayitsizRol = guild.roles.cache.find(r => r.name.includes('Ronin') || r.name.includes('Kayıtsız'));
      const mangaRol = guild.roles.cache.find(r => r.name.includes('Manga Okuru'));

      if (kayitliRol && member.roles.cache.has(kayitliRol.id)) {
        return interaction.reply({
          content: '⛩️ Zaten klan mührüne sahipsin ve kayıtlısın samuray!',
          ephemeral: true
        });
      }

      try {
        if (kayitsizRol && member.roles.cache.has(kayitsizRol.id)) {
          await member.roles.remove(kayitsizRol);
        }
        if (kayitliRol) await member.roles.add(kayitliRol);
        if (mangaRol) await member.roles.add(mangaRol);

        ryoEkle(member.id, 50);

        // Kayıt Log
        const logKanal = guild.channels.cache.find(c => c.isTextBased() && (c.name.includes('kayıt-mühür') || c.name.includes('kayıt-log') || c.name.includes('kayit-log') || c.name.includes('mod-log')));
        if (logKanal) {
          logKanal.send(`📝 **[BUTON KAYIT]** ${member.user.tag} (${member.id}) kayıt kapısından mührünü basarak aramıza katıldı.`).catch(() => {});
        }

        // Hoş geldin kanalında anons et
        const hosgeldinKanal = guild.channels.cache.find(c => c.isTextBased() && (c.name.includes('yeni-savaşçılar') || c.name.includes('yeni-savascilar') || c.name.includes('hoş-geldin') || c.name.includes('hos-geldin')));
        if (hosgeldinKanal) {
          hosgeldinKanal.send({
            content: `🌸 **Aramıza Hoş Geldin ${member}!** Artık Kage kalesinin şerefli bir üyesisin. Sohbet odalarında kılıcını kınından çıkarabilirsin!`
          }).catch(() => {});
        }

        return interaction.reply({
          content: `⛩️ **Mührün onaylandı ${member}!** Artık resmi bir **Shinobi**sin.\n💰 Cüzdanına \`+50 Ryo\` hoş geldin ödülü aktarıldı!\n📖 Kanalların kilidi açıldı, keyifli okumalar dileriz.`,
          ephemeral: true
        });
      } catch (err) {
        return interaction.reply({
          content: `❌ Kayıt işlemi sırasında yetki hatası: ${err.message}\nLütfen bot rolünün hiyerarşide üstte olduğundan emin olun.`,
          ephemeral: true
        });
      }
    }
  }

  // 3. ChatInputCommand (Eğik çizgi komutu) etkileşimi
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
