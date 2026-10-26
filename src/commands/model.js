import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { belirliModelUret, DESTEKLENEN_MODELLER, saglayiciDurumu } from '../services/aiRouterServisi.js';
import { aiErisimKontrol, aiSpamKontrol } from '../services/aiErisimServisi.js';
import { kullaniciModelSec, kullaniciModelGetir, kullaniciHafizasiGetir } from '../services/kageHafizaServisi.js';

export const data = new SlashCommandBuilder()
  .setName('model')
  .setDescription('Yapay zeka modellerini listeler ve istediğiniz modelle anlık veya kalıcı konuşmanızı sağlar.')
  .addSubcommand(sub =>
    sub.setName('liste')
      .setDescription('Kage Bot bünyesindeki tüm aktif yapay zeka modellerini ve durumlarını listeler.')
  )
  .addSubcommand(sub =>
    sub.setName('sec')
      .setDescription('Sohbet ederken kullanmak istediğin varsayılan yapay zeka modelini belirler.')
      .addStringOption(opt =>
        opt.setName('secim')
          .setDescription('Varsayılan model tercihin (Ortak hafıza korunur)')
          .setRequired(true)
          .addChoices(
            { name: '🤖 Otomatik (Kage Akıllı Yönlendirme)', value: 'auto' },
            { name: '💎 Google Gemini 3.5 Flash', value: 'gemini' },
            { name: '⚡ Groq GPT-OSS-120B (Ultra Hızlı)', value: 'groq_120b' },
            { name: '⚡ Groq Qwen 27B (Akıcı Sohbet)', value: 'groq_qwen' },
            { name: '🌀 OpenRouter (DeepSeek / Llama)', value: 'openrouter_free' },
            { name: '🌸 Pollinations AI (%100 Ücretsiz)', value: 'pollinations' }
          )
      )
  )
  .addSubcommand(sub =>
    sub.setName('sor')
      .setDescription('İstediğiniz yapay zeka modelini seçerek anlık olarak danışın.')
      .addStringOption(opt =>
        opt.setName('mesaj')
          .setDescription('Yapay zekaya sormak istediğiniz soru veya metin')
          .setRequired(true)
      )
      .addStringOption(opt =>
        opt.setName('secim')
          .setDescription('Kullanmak istediğiniz yapay zeka modeli (Varsayılan: Otomatik)')
          .setRequired(false)
          .addChoices(
            { name: '🤖 Otomatik (Kage Akıllı Yönlendirme)', value: 'auto' },
            { name: '💎 Google Gemini 3.5 Flash', value: 'gemini' },
            { name: '⚡ Groq GPT-OSS-120B (Ultra Hızlı)', value: 'groq_120b' },
            { name: '⚡ Groq Qwen 27B (Akıcı Sohbet)', value: 'groq_qwen' },
            { name: '🌀 OpenRouter (DeepSeek / Llama)', value: 'openrouter_free' },
            { name: '🌸 Pollinations AI (%100 Ücretsiz)', value: 'pollinations' }
          )
      )
  );

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();

  if (sub === 'liste') {
    const durum = saglayiciDurumu();

    const alanlar = DESTEKLENEN_MODELLER.map(m => {
      let aktifMi = true;
      if (m.id === 'gemini') aktifMi = durum.gemini;
      else if (m.id.startsWith('groq')) aktifMi = durum.groq;
      else if (m.id.startsWith('openrouter')) aktifMi = durum.openrouter;

      const durumRozeti = aktifMi ? '🟢 `Hazır & Aktif`' : '🔴 `Devre Dışı`';
      return {
        name: `${m.emoji} ${m.ad}`,
        value: `${durumRozeti} • **Sağlayıcı:** ${m.saglayici}\n*${m.aciklama}*`,
        inline: false
      };
    });

    const embed = kageEmbed({
      baslik: '⛩️ KAGE ÇOKLU YAPAY ZEKA MODELLERİ',
      renk: TEMA.RENKLER.ALTIN,
      aciklama: `Kage-95 botu **Zero-Downtime Multi-AI Mesh** mimarisiyle çalışır. Herhangi bir model çökerse diğeri otomatik devreye girer.\n\n` +
        `💡 *İstediğin bir modeli seçip doğrudan konuşmak için:*\n\`/model sor mesaj: <sorun> secim: <model>\``,
      alanlar,
      altMetin: `Kage AI Modelleri • İsteyen: ${interaction.user.tag}`
    });

    return interaction.reply({ embeds: [embed] });
  }

  if (sub === 'sec') {
    const secilen = interaction.options.getString('secim');
    kullaniciModelSec(interaction.user.id, secilen);
    const modelBilgi = DESTEKLENEN_MODELLER.find(m => m.id === secilen) || { ad: secilen, emoji: '⚡' };

    const embed = kageEmbed({
      baslik: `${modelBilgi.emoji} MODEL TERCİHİ GÜNCELLENDİ`,
      renk: TEMA.RENKLER.BASARI,
      aciklama: `Varsayılan yapay zeka motorun başarıyla **${modelBilgi.ad}** olarak ayarlandı samurayım!\n\n` +
        `🧠 **Ortak Hafıza Garantisi:** Hangi modeli seçersen seç, Kage senin hakkındaki tüm bilgileri, konuşmalarınızı ve anılarınızı tek bir merkezi beyinde (\`data/kage_hafiza.json\`) hatırlar.\n\n` +
        `💬 *Artık sohbette Kage ile konuştuğunda bu model seninle ilgilenecek. İstersen sohbette doğrudan \`kage gemini'ye geç\` ya da \`kage groq'a geç\` yazarak da değiştirebilirsin!*`,
      altMetin: `Tercih: ${modelBilgi.ad} • Kullanıcı: ${interaction.user.username}`
    });

    return interaction.reply({ embeds: [embed] });
  }

  if (sub === 'sor') {
    // 1. Yetki ve Rol Kontrolü
    const erisim = aiErisimKontrol(interaction.member, interaction.guild, interaction.client);
    if (!erisim.izin) {
      return interaction.reply({ content: erisim.sebep, flags: MessageFlags.Ephemeral });
    }

    // 2. Kötüye Kullanım & Spam Önleme
    const spam = aiSpamKontrol(interaction.user.id, 8, erisim.yetkili);
    if (!spam.izin) {
      return interaction.reply({ content: spam.sebep, flags: MessageFlags.Ephemeral });
    }

    const mesaj = interaction.options.getString('mesaj');
    const modelKodu = interaction.options.getString('secim') || 'auto';

    await interaction.deferReply();

    try {
      const kHafiza = kullaniciHafizasiGetir(interaction.user.id);
      let hafizaNotu = '';
      if (kHafiza?.notlar?.length) {
        hafizaNotu += `\n[KULLANICI BİLGİLERİ (Hafıza)]: Bu kullanıcı hakkında bildiklerin: ${kHafiza.notlar.map(n => n.not).join(', ')}.`;
      }
      if (kHafiza?.profil?.kisaOzet) {
        hafizaNotu += `\n[PROFİL]: ${kHafiza.profil.kisaOzet}`;
      }

      const { metin, model, sureMs } = await belirliModelUret({
        prompt: mesaj,
        modelKodu,
        userId: interaction.user.id,
        system: `Sen Kage-95 Discord botunun bilge, adaletli ve samimi samuray asistanısın. Türkçe, samimi ve net yanıt ver.${hafizaNotu}`
      });

      const kirpilmis = metin.length > 4000 ? metin.slice(0, 3990) + '...\n*(Uzun metin kesildi)*' : metin;

      const embed = kageEmbed({
        baslik: `⛩️ GÖLGE VEZİRİ CEVABI • ${model}`,
        renk: TEMA.RENKLER.KAN_KIRMIZISI,
        aciklama: kirpilmis,
        alanlar: [
          {
            name: `${TEMA.EMOJILER.PARSOMEN} Danışılan Konu`,
            value: `*${mesaj.length > 250 ? mesaj.slice(0, 247) + '...' : mesaj}*`,
            inline: false
          }
        ],
        altMetin: `Model: ${model} • Yanıt Süresi: ${sureMs} ms • İsteyen: ${interaction.user.username}`
      });

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('[Model Sor Hata]:', err.message);
      return interaction.editReply({
        content: `❌ **Yapay Zeka Hatası:** Seçtiğin model yanıt veremedi (\`${err.message}\`). Lütfen \`/model sor secim: Otomatik\` deneyin.`
      });
    }
  }
}
