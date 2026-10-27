import { Events, MessageFlags } from 'discord.js';
import { onayButonuMu, onayButonunuIsle } from '../services/ai/onayServisi.js';
import { komutNiyetButonuMu, komutNiyetButonunuIsle } from '../services/komutNiyetServisi.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { ryoEkle } from '../services/ekonomiServisi.js';
import { kayitModaliOlustur, kayitModalVerileriniOku, kayitIsleminiTamamla, kullaniciKayitBilgileriniGetir } from '../services/kayitServisi.js';

export const name = Events.InteractionCreate;

// Aynı kullanıcının komut seline karşı basit hız sınırı.
const KOMUT_ARALIK_MS = 1200;
const sonKomut = new Map();

function hizSiniriAsildiMi(userId) {
  const simdi = Date.now();
  const son = sonKomut.get(userId) || 0;
  if (simdi - son < KOMUT_ARALIK_MS) return true;
  sonKomut.set(userId, simdi);
  if (sonKomut.size > 5000) {
    for (const [k, v] of sonKomut) if (simdi - v > 60_000) sonKomut.delete(k);
  }
  return false;
}

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

  // 2. Buton Tıklamaları (Kayıt Ol, Profil Güncelleme, Kurallar)
  if (interaction.isButton()) {
    if (onayButonuMu(interaction.customId)) return onayButonunuIsle(interaction);
    if (komutNiyetButonuMu(interaction.customId)) return komutNiyetButonunuIsle(interaction);

    // Komut modülleri `butonOnek` ve `buton(interaction)` dışa aktararak kendi kalıcı butonlarını yönetir.
    for (const komut of interaction.client.commands.values()) {
      if (komut.butonOnek && komut.buton && interaction.customId.startsWith(komut.butonOnek)) {
        try {
          return await komut.buton(interaction);
        } catch (err) {
          console.error(`[InteractionCreate] ${komut.butonOnek} buton hatası:`, err.message);
          const yanit = { content: '❌ Bu işlem şu an yapılamadı.', flags: MessageFlags.Ephemeral };
          if (interaction.replied || interaction.deferred) return interaction.followUp(yanit).catch(() => null);
          return interaction.reply(yanit).catch(() => null);
        }
      }
    }
    if (interaction.customId === 'kage_kayit_ol_btn' || interaction.customId === 'kage_profil_guncelle_btn') {
      const varsayilanlar = kullaniciKayitBilgileriniGetir(interaction.user.id, interaction.member);
      const modal = kayitModaliOlustur(varsayilanlar);
      return interaction.showModal(modal).catch(err => {
        console.error('[InteractionCreate] Modal açma hatası:', err.message);
      });
    }

    if (interaction.customId === 'kage_kurallar_btn') {
      const kurallarEmbed = kageEmbed({
        baslik: '📜 KAGE KALESİ • BUSHIDO KURALLARI',
        renk: TEMA.RENKLER.BILGI,
        aciklama: `Kage-95 kalesinin huzuru, saygısı ve onuru aşağıdaki kurallarla korunur:\n\n` +
          `1️⃣ **Saygı & Nezaket:** Her klan üyesine saygılı davranın. Hakaret, nefret söylemi ve taciz kesinlikle yasaktır.\n` +
          `2️⃣ **Spoiler Yasağı:** Güncel manga ve anime bölümlerine dair spoilerları \`#spoiler\` odası dışında veya spoiler etiketi olmadan paylaşmayın.\n` +
          `3️⃣ **Reklam & Spam:** Özelden veya kanallardan yetkisiz sunucu/link reklamı yapmak yasaktır.\n` +
          `4️⃣ **Kanalların Amacı:** Sohbeti ilgili odalarda (Manga, Zindan, Kumar, Bot Komutları) sürdürün.\n` +
          `5️⃣ **Yetkili Kararları:** Şogun ve Daimyo moderatörlerinin uyarılarını dikkate alın.\n\n` +
          `*Onurlu bir samuray veya kunoichi sözünü tutar, kılıcını adaletsizce çekmez.*`,
        altMetin: 'Kage Kalesi Onur Yasası'
      });
      return interaction.reply({ embeds: [kurallarEmbed], flags: MessageFlags.Ephemeral });
    }

    // 4. AI Hızlı Eylem Butonları (ai_sil_, ai_ogren_, ai_baska_)
    if (interaction.customId.startsWith('ai_sil_')) {
      const hedefId = interaction.customId.replace('ai_sil_', '');
      if (interaction.user.id !== hedefId) {
        return interaction.reply({ content: '❌ Yalnızca kendi hafıza kaydını sıfırlayabilirsin samuray.', flags: MessageFlags.Ephemeral });
      }

      const { kullaniciUnut } = await import('../services/kageHafizaServisi.js');
      kullaniciUnut(hedefId);
      return interaction.reply({
        content: '🗑️ **Hafızan başarıyla sıfırlandı samurayım!**\nKage\'nin senin hakkında tuttuğu tüm notlar ve profil kayıtları silindi. Temiz bir parşömenle baştan başlıyoruz.',
        flags: MessageFlags.Ephemeral
      });
    }

    if (interaction.customId.startsWith('ai_ogren_')) {
      const hedefId = interaction.customId.replace('ai_ogren_', '');
      const { kullaniciHafizasiGetir, profilGetir } = await import('../services/kageHafizaServisi.js');
      const uNot = kullaniciHafizasiGetir(hedefId);
      const profil = profilGetir(hedefId);

      const notMetni = uNot?.notlar?.length ? uNot.notlar.map(n => `• ${n}`).join('\n') : 'Henüz özel bir anı kaydedilmedi.';
      const kisaOzet = profil?.kisaOzet || 'Sadık Kage Kalesi savaşçısı.';

      const embed = kageEmbed({
        baslik: '🧠 KAGE DERİN HAFIZA BİLGİSİ',
        renk: TEMA.RENKLER.BILGI,
        aciklama: `Kage-95'in senin hakkında aklında tuttuğu kayıtlar:\n\n` +
          `📝 **Kısa Özet:** *"${kisaOzet}"*\n\n` +
          `📜 **Notlar:**\n${notMetni}`,
        altMetin: 'Kage Merkezi Hafıza Bankası'
      });

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    if (interaction.customId.startsWith('ai_baska_')) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      try {
        const { belirliModelUret } = await import('../services/aiRouterServisi.js');
        // Mesajın içeriğini al
        const orijinalMesaj = interaction.message.embeds?.[0]?.description || interaction.message.content || 'Sohbet';
        const temizSoru = orijinalMesaj.slice(0, 300);

        const sonuc = await belirliModelUret({
          prompt: `Aşağıdaki konuyu diğer yapay zekalardan farklı olarak ultra hızlı ve özgün bir samuray perspektifinden yorumla:\n"${temizSoru}"`,
          modelKodu: 'groq_120b',
          userId: interaction.user.id,
          userName: interaction.user.username
        });

        const embed = kageEmbed({
          baslik: `⚡ FARKLI BAKIŞ AÇISI • ${sonuc.model}`,
          renk: TEMA.RENKLER.ALTIN,
          aciklama: sonuc.metin,
          altMetin: `Karşılaştırmalı Yapay Zeka • Yanıt: ${sonuc.sureMs} ms`
        });

        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        return interaction.editReply({ content: `❌ Alternatif modele danışılırken hata oluştu: ${err.message}` });
      }
    }
  }

  // 3. Modal Form Gönderimleri (Detaylı Kayıt İşlemi)
  if (interaction.isModalSubmit()) {
    if (interaction.customId === 'kage_kayit_modal') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      try {
        const { embed, files, row } = await kayitIsleminiTamamla(interaction, {
          hedefUye: interaction.member,
          ...kayitModalVerileriniOku(interaction)
        });

        return interaction.editReply({
          embeds: [embed],
          files,
          components: row ? [row] : []
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

    if (hizSiniriAsildiMi(interaction.user.id)) {
      return interaction.reply({ content: '⏳ Biraz yavaş, samuray. Komutlar arasında bir saniye bekle.', flags: MessageFlags.Ephemeral }).catch(() => null);
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
        await interaction.followUp({ embeds: [hataEmbed], flags: MessageFlags.Ephemeral }).catch(() => null);
      } else {
        await interaction.reply({ embeds: [hataEmbed], flags: MessageFlags.Ephemeral }).catch(() => null);
      }
    }
  }
}
