import { ChannelType, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { eskiKanallariTemizle, eskiRolleriTemizle, kageMimarisiInsaEt } from './sunucuMimarisiServisi.js';
import { ryoEkle, bakiyeGetir, liderlikListesi } from './ekonomiServisi.js';
import { duyuruKanaliniBul } from './duyuruServisi.js';
import { tumMangalariGetir, mangaAra, mangaDetayGetir, sonEklenenBolumleriGetir } from './mangaServisi.js';
import { hafizaYukle, hafizaKaydet, kullaniciNotuEkle, bilgiOgren, hafizaArama, gunlukDerinOgrenme } from './kageHafizaServisi.js';

/**
 * AI tarafından çağrılan Discord eylemlerini yetki kontrolüyle güvenli ve kusursuz şekilde yürütür.
 */
export async function aiEylemiCalistir({ eylem, parametreler = {}, guild, channel, member, client }) {
  if (!guild || !member) {
    return { basarili: false, hata: 'Sunucu veya üye bağlamı bulunamadı.' };
  }

  const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
  const isManager = member.permissions.has(PermissionFlagsBits.ManageGuild);
  const isMod = member.permissions.has(PermissionFlagsBits.ManageMessages);
  const canChannels = member.permissions.has(PermissionFlagsBits.ManageChannels);
  const canRoles = member.permissions.has(PermissionFlagsBits.ManageRoles);

  try {
    switch (eylem) {
      // 1. Sunucu Sıfırlama ve Yeniden İnşa
      case 'sunucu_sifirla': {
        if (!isAdmin && !isManager) {
          return { basarili: false, hata: 'Bu kadim eylem için Şogun (Yönetici) yetkisi gereklidir.' };
        }

        const cmdChanId = channel.id;
        await eskiKanallariTemizle(guild, cmdChanId);
        await eskiRolleriTemizle(guild);
        const sonuclar = await kageMimarisiInsaEt(guild, { user: member.user });

        setTimeout(async () => {
          try {
            const c = await guild.channels.fetch(cmdChanId).catch(() => null);
            if (c) await c.delete('AI Sıfırlama sonrası imha');
          } catch {}
        }, 5000);

        return {
          basarili: true,
          detay: 'Tüm eski kanallar ve roller silindi. Yeni Kage 95 mimarisi başarıyla inşa edildi! (Bu geçici kanal 5 saniye içinde silinecektir)'
        };
      }

      // 2. Sunucu Kurma (Eskileri silmeden)
      case 'sunucu_kur': {
        if (!isAdmin && !isManager) {
          return { basarili: false, hata: 'Bu eylem için Şogun (Yönetici) yetkisi gereklidir.' };
        }
        await kageMimarisiInsaEt(guild, { user: member.user });
        return {
          basarili: true,
          detay: 'Kage 95 mimarisi, kayıt kapısı ve roller eksiksiz inşa edildi.'
        };
      }

      // 3. Yeni Kategori Oluşturma (Kage Punk Estetiğinde)
      case 'kategori_olustur': {
        if (!canChannels && !isAdmin) {
          return { basarili: false, hata: 'Kategori açmak için Kanalları Yönet yetkisi gereklidir.' };
        }
        const hamIsim = parametreler.isim || 'YENİ ALAN';
        const susluIsim = hamIsim.includes('━━━') ? hamIsim : `╭━━━ ${hamIsim.toUpperCase()} ━━━╮`;
        
        const yeniKat = await guild.channels.create({
          name: susluIsim,
          type: ChannelType.GuildCategory,
          reason: `Kage-95 AI talimatı: ${member.user.tag}`
        });

        // Eğer kategori içine hemen kanal da eklenmesi istenmişse
        if (parametreler.kanallar && Array.isArray(parametreler.kanallar)) {
          for (const kAd of parametreler.kanallar) {
            await guild.channels.create({
              name: kAd.toLowerCase().replace(/\s+/g, '-'),
              type: ChannelType.GuildText,
              parent: yeniKat.id
            });
          }
        }

        return {
          basarili: true,
          detay: `\`${susluIsim}\` kategorisi oluşturuldu.${parametreler.kanallar ? ` İçine ${parametreler.kanallar.length} adet kanal eklendi.` : ''}`
        };
      }

      // 4. Yeni Kanal Oluşturma (Metin / Ses / Kategoriye Bağlı)
      case 'kanal_olustur': {
        if (!canChannels && !isAdmin) {
          return { basarili: false, hata: 'Kanal açmak için Kanalları Yönet yetkisi gereklidir.' };
        }
        let isim = (parametreler.isim || 'yeni-kanal').toLowerCase().replace(/\s+/g, '-');
        if (parametreler.emoji && !isim.includes(parametreler.emoji)) {
          isim = `${parametreler.emoji}・${isim}`;
        }
        const tip = parametreler.tur === 'ses' ? ChannelType.GuildVoice : ChannelType.GuildText;

        // Hedef kategori bul
        let parentId = null;
        if (parametreler.kategori) {
          const kat = guild.channels.cache.find(c => 
            c.type === ChannelType.GuildCategory && 
            c.name.toLowerCase().includes(parametreler.kategori.toLowerCase())
          );
          if (kat) parentId = kat.id;
        } else if (channel.parentId) {
          parentId = channel.parentId;
        }

        const yeniKanal = await guild.channels.create({
          name: isim,
          type: tip,
          parent: parentId,
          topic: parametreler.aciklama || 'Kage 95 Meclisi',
          reason: `Kage-95 AI talimatı: ${member.user.tag}`
        });

        return {
          basarili: true,
          detay: `${yeniKanal} kanalı başarıyla inşa edildi.${parentId ? ' (İlgili kategoriye bağlandı)' : ''}`
        };
      }

      // 5. Kanal Silme
      case 'kanal_sil': {
        if (!canChannels && !isAdmin) {
          return { basarili: false, hata: 'Kanal silmek için Kanalları Yönet yetkisi gereklidir.' };
        }
        let hedefKanal = null;
        if (parametreler.kanal_id) {
          hedefKanal = await guild.channels.fetch(parametreler.kanal_id).catch(() => null);
        } else if (parametreler.isim) {
          const aranan = parametreler.isim.toLowerCase().replace('#', '').trim();
          hedefKanal = guild.channels.cache.find(c => c.name.toLowerCase().includes(aranan));
        }
        if (!hedefKanal) {
          return { basarili: false, hata: `Silinecek kanal (\`${parametreler.isim || parametreler.kanal_id}\`) bulunamadı.` };
        }
        const silinenAd = hedefKanal.name;
        await hedefKanal.delete(`Kage-95 AI talimatı: ${member.user.tag}`);
        return {
          basarili: true,
          detay: `\`#${silinenAd}\` kanalı silindi ve ortadan kaldırıldı.`
        };
      }

      // 6. Kanal Düzenleme (İsim, Konu, Yavaş Mod Değiştirme)
      case 'kanal_duzenle': {
        if (!canChannels && !isAdmin) {
          return { basarili: false, hata: 'Kanal düzenlemek için Kanalları Yönet yetkisi gereklidir.' };
        }
        let hedefKanal = channel;
        if (parametreler.kanal) {
          const aranan = parametreler.kanal.toLowerCase().replace('#', '').trim();
          hedefKanal = guild.channels.cache.find(c => c.name.toLowerCase().includes(aranan)) || channel;
        }

        const guncellemeler = {};
        if (parametreler.yeni_isim) guncellemeler.name = parametreler.yeni_isim.toLowerCase().replace(/\s+/g, '-');
        if (parametreler.konu) guncellemeler.topic = parametreler.konu;
        if (parametreler.yavasmod !== undefined) guncellemeler.rateLimitPerUser = parseInt(parametreler.yavasmod, 10);

        await hedefKanal.edit(guncellemeler);
        return {
          basarili: true,
          detay: `${hedefKanal} kanalı başarıyla güncellendi.`
        };
      }

      // 7. Yeni Rol Oluşturma (Özel Renk, Yetki ve İsimle)
      case 'rol_olustur': {
        if (!canRoles && !isAdmin) {
          return { basarili: false, hata: 'Rol oluşturmak için Rolleri Yönet yetkisi gereklidir.' };
        }
        const isim = parametreler.isim || 'Yeni Rol';
        let renk = 0xe53935; // Varsayılan Kage Kırmızısı
        if (parametreler.renk) {
          const rLower = parametreler.renk.toLowerCase();
          if (rLower === 'altin' || rLower === 'sari') renk = 0xffd700;
          else if (rLower === 'mor') renk = 0x9c27b0;
          else if (rLower === 'mavi') renk = 0x2196f3;
          else if (rLower === 'yesil') renk = 0x4caf50;
          else if (rLower === 'siyah') renk = 0x212121;
          else if (rLower === 'beyaz') renk = 0xffffff;
          else if (parametreler.renk.startsWith('#')) renk = parseInt(parametreler.renk.slice(1), 16);
          else if (!isNaN(parseInt(parametreler.renk, 16))) renk = parseInt(parametreler.renk, 16);
        }

        const yeniRol = await guild.roles.create({
          name: isim,
          color: renk,
          hoist: parametreler.ayri_goster !== false,
          mentionable: true,
          reason: `Kage-95 AI talimatı: ${member.user.tag}`
        });

        return {
          basarili: true,
          detay: `**${yeniRol.name}** rolü kalede oluşturuldu! (Renk: \`#${renk.toString(16)}\`)`
        };
      }

      // 8. Rol Silme
      case 'rol_sil': {
        if (!canRoles && !isAdmin) {
          return { basarili: false, hata: 'Rol silmek için Rolleri Yönet yetkisi gereklidir.' };
        }
        const aranan = (parametreler.isim || '').toLowerCase();
        const rol = guild.roles.cache.find(r => r.name.toLowerCase().includes(aranan));
        if (!rol) return { basarili: false, hata: `\`${parametreler.isim}\` rolü bulunamadı.` };

        const silinenAd = rol.name;
        await rol.delete(`Kage-95 AI talimatı: ${member.user.tag}`);
        return {
          basarili: true,
          detay: `\`${silinenAd}\` rolü sunucudan tamamen silindi.`
        };
      }

      // 9. Rol Verme
      case 'rol_ver': {
        if (!canRoles && !isAdmin) {
          return { basarili: false, hata: 'Rol vermek için Rolleri Yönet yetkisi gerekir.' };
        }
        const target = await hedefUyeBul(guild, parametreler.kullanici);
        if (!target) return { basarili: false, hata: 'Hedef üye bulunamadı.' };

        const rol = guild.roles.cache.find(r => r.name.toLowerCase().includes((parametreler.rol || '').toLowerCase()));
        if (!rol) return { basarili: false, hata: `\`${parametreler.rol}\` rolü bulunamadı.` };

        await target.roles.add(rol);
        return {
          basarili: true,
          detay: `${target} üyesine **${rol.name}** rolü bahşedildi.`
        };
      }

      // 10. Rol Alma
      case 'rol_al': {
        if (!canRoles && !isAdmin) {
          return { basarili: false, hata: 'Rol almak için Rolleri Yönet yetkisi gerekir.' };
        }
        const target = await hedefUyeBul(guild, parametreler.kullanici);
        if (!target) return { basarili: false, hata: 'Hedef üye bulunamadı.' };

        const rol = guild.roles.cache.find(r => r.name.toLowerCase().includes((parametreler.rol || '').toLowerCase()));
        if (!rol) return { basarili: false, hata: `\`${parametreler.rol}\` rolü bulunamadı.` };

        await target.roles.remove(rol);
        return {
          basarili: true,
          detay: `${target} üyesinden **${rol.name}** rolü geri alındı.`
        };
      }

      // 11. Toplu Mesaj Temizleme
      case 'mesaj_sil': {
        if (!isMod && !isManager && !isAdmin) {
          return { basarili: false, hata: 'Mesajları temizlemek için Moderatör yetkisi gerekir.' };
        }
        const sayi = Math.min(100, Math.max(1, parseInt(parametreler.sayi || 10, 10)));
        const silinenler = await channel.bulkDelete(sayi, true);
        return {
          basarili: true,
          detay: `${silinenler.size} adet mesaj gölgelere çekilerek yok edildi.`
        };
      }

      // 12. Duyuru Yayınlama (Gelişmiş)
      case 'duyuru_yap': {
        if (!isMod && !isManager && !isAdmin) {
          return { basarili: false, hata: 'Duyuru yayınlamak için yetkiniz yetersiz.' };
        }
        const duyuruKanali = duyuruKanaliniBul(client) || channel;
        const baslik = parametreler.baslik || 'Önemli Klan Duyurusu';
        const icerik = parametreler.icerik || parametreler.mesaj || 'Kalede yeni bir ferman ilan edildi.';

        const embed = kageEmbed({
          baslik: `📢 ${baslik.toUpperCase()}`,
          renk: TEMA.RENKLER.KAN_KIRMIZISI,
          aciklama: icerik,
          footer: `Kage Fermanı • Emreden: ${member.displayName}`
        });

        await duyuruKanali.send({
          content: parametreler.etiket ? '@everyone' : undefined,
          embeds: [embed]
        });
        return {
          basarili: true,
          detay: `Duyurunuz ${duyuruKanali} kanalında klan üyelerine ilan edildi.`
        };
      }

      // 13. Kurallara Yeni Madde Ekleme
      case 'kural_ekle': {
        if (!isManager && !isAdmin) {
          return { basarili: false, hata: 'Kuralları güncellemek için Yönetici yetkisi gereklidir.' };
        }
        const kuralKanali = guild.channels.cache.find(c => c.name.includes('kural') && c.isTextBased());
        if (!kuralKanali) return { basarili: false, hata: 'Kurallar kanalı bulunamadı.' };

        const yeniKural = parametreler.kural || parametreler.metin || 'Yetkililere saygısızlık yasaktır.';
        const kuralEmbed = kageEmbed({
          baslik: '📜 KALE KANUNLARINA YENİ MADDE EKLENDİ',
          renk: TEMA.RENKLER.KAN_KIRMIZISI,
          aciklama: `**Şogun ${member} tarafından yürürlüğe koyulan yeni kanun:**\n\n⚖️ **${yeniKural}**\n\n*Bu kurala uymayanlar sürgün edilecektir.*`
        });

        await kuralKanali.send({ embeds: [kuralEmbed] });
        return {
          basarili: true,
          detay: `Yeni kural maddesi ${kuralKanali} kanalına başarıyla asıldı.`
        };
      }

      // 14. Anket Başlatma
      case 'anket_yap': {
        if (!isMod && !isManager && !isAdmin) {
          return { basarili: false, hata: 'Anket başlatmak için Moderatör yetkisi gerekir.' };
        }
        const soru = parametreler.soru || 'Bu kararı onaylıyor musunuz?';
        const secenekler = parametreler.secenekler || ['Evet', 'Hayır'];
        const emojiler = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

        let aciklama = `**${soru}**\n\n`;
        secenekler.forEach((s, i) => {
          aciklama += `${emojiler[i] || '▫️'} **${s}**\n`;
        });

        const anketEmbed = kageEmbed({
          baslik: '🗳️ KLAN OYLAMASI & ANKET',
          renk: TEMA.RENKLER.UYARI_SARI,
          aciklama,
          footer: `Oyunuzu aşağıdaki reaksiyonlarla belirtin • ${member.displayName}`
        });

        const msg = await channel.send({ embeds: [anketEmbed] });
        for (let i = 0; i < secenekler.length && i < emojiler.length; i++) {
          await msg.react(emojiler[i]).catch(() => {});
        }

        return {
          basarili: true,
          detay: `Anket bu kanalda başlatıldı ve oylama açıldı.`
        };
      }

      // 15. Kullanıcı Susturma (Timeout)
      case 'kullanici_sustur': {
        if (!isMod && !isManager && !isAdmin) {
          return { basarili: false, hata: 'Üye susturmak için Moderatör yetkisi gerekir.' };
        }
        const target = await hedefUyeBul(guild, parametreler.kullanici);
        if (!target) return { basarili: false, hata: 'Hedef üye bulunamadı.' };

        const dakika = parseInt(parametreler.dakika || 10, 10);
        const sebep = parametreler.sebep || 'Kage AI Veziri kararı';

        await target.timeout(dakika * 60 * 1000, sebep);
        return {
          basarili: true,
          detay: `${target} kullanıcısı ${dakika} dakika susturuldu. (Sebep: ${sebep})`
        };
      }

      // 16. Kullanıcı Atma (Kick)
      case 'kullanici_at': {
        if (!member.permissions.has(PermissionFlagsBits.KickMembers) && !isAdmin) {
          return { basarili: false, hata: 'Üye atmak için Üyeleri At yetkisi gerekir.' };
        }
        const target = await hedefUyeBul(guild, parametreler.kullanici);
        if (!target) return { basarili: false, hata: 'Hedef üye bulunamadı.' };

        const sebep = parametreler.sebep || 'Kage AI Veziri kararı';
        await target.kick(sebep);
        return {
          basarili: true,
          detay: `${target.user.tag} kaleden sürüldü.`
        };
      }

      // 17. Kullanıcı Yasaklama (Ban)
      case 'kullanici_yasakla': {
        if (!member.permissions.has(PermissionFlagsBits.BanMembers) && !isAdmin) {
          return { basarili: false, hata: 'Üye yasaklamak için Üyeleri Yasakla yetkisi gerekir.' };
        }
        const target = await hedefUyeBul(guild, parametreler.kullanici);
        if (!target) return { basarili: false, hata: 'Hedef üye bulunamadı.' };

        const sebep = parametreler.sebep || 'Kage AI Veziri kararı';
        await target.ban({ reason: sebep });
        return {
          basarili: true,
          detay: `${target.user.tag} kaleden ebediyen yasaklandı.`
        };
      }

      // 18. Yavaş Mod Ayarla
      case 'yavasmod_ayarla': {
        if (!isMod && !isManager && !isAdmin) {
          return { basarili: false, hata: 'Yavaş mod için yetkiniz yetersiz.' };
        }
        const saniye = Math.min(21600, Math.max(0, parseInt(parametreler.saniye || 5, 10)));
        await channel.setRateLimitPerUser(saniye);
        return {
          basarili: true,
          detay: saniye === 0 ? 'Bu kanalda yavaş mod kapatıldı.' : `Bu kanala ${saniye} saniye yavaş mod uygulandı.`
        };
      }

      // 19. Kanal Kilitle / Aç
      case 'kilit_ayarla': {
        if (!canChannels && !isAdmin) {
          return { basarili: false, hata: 'Kanal kilidi için Kanalları Yönet yetkisi gerekir.' };
        }
        const kilitle = parametreler.durum === 'kapat' || parametreler.durum === 'kilitle';
        await channel.permissionOverwrites.edit(guild.roles.everyone, {
          SendMessages: kilitle ? false : null
        });
        return {
          basarili: true,
          detay: kilitle ? 'Kanal kilitlendi; üyelerin mesaj göndermesi engellendi.' : 'Kanalın kilidi açıldı; üyeler yeniden yazabilir.'
        };
      }

      // 20. Ryo Para Ekleme (Şogun / Admin)
      case 'ryo_ekle': {
        if (!isAdmin) {
          return { basarili: false, hata: 'Ryo hazinesini yönetmek için Şogun (Admin) yetkisi gerekir.' };
        }
        const target = await hedefUyeBul(guild, parametreler.kullanici) || member;
        const miktar = parseInt(parametreler.miktar || 100, 10);
        const yeniBakiye = ryoEkle(target.id, miktar);
        return {
          basarili: true,
          detay: `${target} cüzdanına \`+${miktar} Ryo\` aktarıldı. Yeni Bakiye: \`${yeniBakiye} Ryo\`.`
        };
      }

      // 21. Canlı kage95.com Web Sitesi Verisi Getirme
      case 'site_veri_getir': {
        const islem = parametreler.islem || 'tum_mangalar';
        if (islem === 'ara') {
          const sonuclar = await mangaAra(parametreler.sorgu || '');
          return {
            basarili: true,
            detay: `kage95.com'da "${parametreler.sorgu || ''}" araması: ${sonuclar.length} seri bulundu.\n` +
              sonuclar.slice(0, 6).map(m => `• **${m.mangaAdi}** (Okunma: ${m.okunmaSayisi || 0}, Tür: ${(m.kategoriler || []).join(', ')})`).join('\n')
          };
        } else if (islem === 'detay') {
          const mId = parametreler.id || parametreler.manga_id;
          const detay = await mangaDetayGetir(mId);
          if (!detay) return { basarili: false, hata: `Manga (${mId}) detayları bulunamadı.` };
          return {
            basarili: true,
            detay: `📖 **${detay.mangaAdi}**\n✍️ Yazar: ${detay.yazar || 'Bilinmiyor'} | 👁️ Okunma: ${detay.okunmaSayisi || 0}\n🏷️ Tür: ${(detay.kategoriler || []).join(', ')}\n📜 Özet: ${detay.aciklama ? detay.aciklama.slice(0, 300) : 'Özet yok'}\n📚 Toplam Bölüm: ${detay.bolumler?.length || 0}`
          };
        } else if (islem === 'son_bolumler') {
          const sonBolumler = await sonEklenenBolumleriGetir();
          return {
            basarili: true,
            detay: `kage95.com Son Eklenen Bölümler:\n` +
              sonBolumler.slice(0, 6).map(b => `• **${b.mangaAdi}** - Bölüm ${b.bolumNo} (${new Date(b.eklenmeTarihi).toLocaleDateString('tr-TR')})`).join('\n')
          };
        } else {
          const mangalar = await tumMangalariGetir();
          return {
            basarili: true,
            detay: `kage95.com kütüphanesinde toplam **${mangalar.length} manga** yayında.\nÖne Çıkanlar: ` +
              mangalar.slice(0, 6).map(m => m.mangaAdi).join(', ')
          };
        }
      }

      // 22. Sunucudaki Kullanıcı Hakkında Derin İstihbarat Raporu
      case 'kullanici_bilgi_getir': {
        const target = await hedefUyeBul(guild, parametreler.kullanici) || member;
        const bakiye = bakiyeGetir(target.id);
        const hafiza = hafizaYukle();
        const kisiNotlari = hafiza.kullaniciNotlari[target.id]?.notlar || [];

        const roller = target.roles.cache
          .filter(r => r.name !== '@everyone')
          .map(r => r.name)
          .slice(0, 6)
          .join(', ') || 'Normal Üye';

        return {
          basarili: true,
          detay: `👤 **${target.displayName} (${target.user.tag})** İstihbarat Raporu:\n` +
            `• Katılım Tarihi: <t:${Math.floor(target.joinedTimestamp / 1000)}:R>\n` +
            `• Rütbe/Roller: \`${roller}\`\n` +
            `• Ses Durumu: ${target.voice.channel ? `🎙️ **${target.voice.channel.name}**` : 'Seste değil'}\n` +
            `• Cüzdan: \`${bakiye.ryo} Ryo\` | Banka: \`${bakiye.banka} Ryo\` | Maaş Serisi: \`${bakiye.streak} Gün\`\n` +
            `• Kuşanılan Kılıç: **${bakiye.kilic?.ad || 'Tahta Kılıç'}** (+%${bakiye.kilic?.bonus || 0} Hasar)\n` +
            `• Zindan Zaferleri: \`${bakiye.zindanZafer || 0}\` | Düellolar: \`${bakiye.duelloZafer || 0}G / ${bakiye.duelloMaglubiyet || 0}M\`\n` +
            `• Çanta/Envanter: \`${(bakiye.envanter || []).join(', ') || 'Boş'}\`\n` +
            `• 🧠 AI Hafıza Notları: ${kisiNotlari.length > 0 ? kisiNotlari.join(' • ') : 'Kişisel not henüz yok.'}`
        };
      }

      // 23. Sunucu ve Kale Telemetrisi
      case 'sunucu_durum_getir': {
        const hafiza = hafizaYukle();
        const totalMembers = guild.memberCount;
        const channelsList = typeof guild.channels?.cache?.filter === 'function'
          ? guild.channels.cache
          : Array.from(guild.channels?.cache?.values ? guild.channels.cache.values() : (guild.channels?.cache || []));

        const textChannels = channelsList.filter(c => c.type === ChannelType.GuildText).size || channelsList.filter(c => c.type === ChannelType.GuildText).length || 0;
        const voiceChannels = channelsList.filter(c => c.type === ChannelType.GuildVoice).size || channelsList.filter(c => c.type === ChannelType.GuildVoice).length || 0;
        const categories = channelsList.filter(c => c.type === ChannelType.GuildCategory).size || channelsList.filter(c => c.type === ChannelType.GuildCategory).length || 0;
        const rolesCount = guild.roles?.cache?.size || (guild.roles?.cache?.length ?? 0);
        const boosters = guild.premiumSubscriptionCount || 0;
        const liderler = liderlikListesi(3);

        return {
          basarili: true,
          detay: `🏰 **${guild.name}** Kalabalık & Sunucu Raporu:\n` +
            `• Toplam Samuray: **${totalMembers}** üye (${boosters} Nitro Takviyesi)\n` +
            `• Kanallar: ${textChannels} Metin, ${voiceChannels} Ses, ${categories} Kategori\n` +
            `• Roller: ${rolesCount} adet aktif rol\n` +
            `• Klanın En Zenginleri: ${liderler.map((l, i) => `${i+1}. <@${l.userId}> (${l.toplam} Ryo)`).join(' | ')}\n` +
            `• kage95.com Kütüphanesi: ${hafiza.siteVerileri.toplamManga} manga yayında`
        };
      }

      // 24. AI Hafızasına Yeni Bilgi veya Kullanıcı Notu Kaydetme
      case 'hafiza_kaydet': {
        const kat = parametreler.kategori || 'genel';
        const baslik = parametreler.baslik || 'Önemli Bilgi';
        const icerik = parametreler.icerik || parametreler.not || parametreler.bilgi;
        if (!icerik) return { basarili: false, hata: 'Hafızaya kaydedilecek içerik belirtilmedi.' };

        if (parametreler.kullanici) {
          const target = await hedefUyeBul(guild, parametreler.kullanici);
          if (target) {
            kullaniciNotuEkle(target.id, target.displayName, icerik);
            return {
              basarili: true,
              detay: `🧠 **${target.displayName}** hakkında hafızama kalıcı olarak kaydedildi:\n*"${icerik}"*`
            };
          }
        }

        bilgiOgren(kat, baslik, icerik, member.displayName);
        return {
          basarili: true,
          detay: `🧠 Gölge Hafıza Bankasına kalıcı olarak kaydedildi:\n**[${baslik}]** *"${icerik}"*`
        };
      }

      // 25. AI Hafıza Bankasında Arama Yapma
      case 'hafiza_ara': {
        const sorgu = parametreler.sorgu || parametreler.kelime;
        if (!sorgu) return { basarili: false, hata: 'Aranacak sorgu belirtilmedi.' };
        const sonuclar = hafizaArama(sorgu, 5);
        if (sonuclar.length === 0) {
          return {
            basarili: true,
            detay: `🧠 Hafıza bankamda "${sorgu}" ile ilgili kayıtlı bir bilgi bulunamadı.`
          };
        }
        return {
          basarili: true,
          detay: `🧠 **Hafıza Bankası Arama Sonuçları ("${sorgu}"):**\n` +
            sonuclar.map(s => `• **${s.baslik}** (${s.tur}): ${s.detay}`).join('\n')
        };
      }

      // 26. Derin Öğrenme & Veri Yenileme Döngüsünü Manuel Tetikleme
      case 'hafiza_yenile': {
        const yeniHafiza = await gunlukDerinOgrenme(client);
        return {
          basarili: true,
          detay: `🧠 **Derin Öğrenme ve Senkronizasyon Tamamlandı!**\n` +
            `• Öğrenme Döngüsü: #${yeniHafiza.ogrenmeSayisi}\n` +
            `• kage95.com Kütüphanesi: ${yeniHafiza.siteVerileri.toplamManga} manga güncellendi.\n` +
            `• Sunucu Telemetrisi: ${yeniHafiza.sunucuVerileri.toplamUye} üye ve hazine kayıtları hafızaya yazıldı.`
        };
      }

      // 27. Herhangi Bir Kanala Özel Mesaj / Ferman Gönderme
      case 'kanal_mesaj_gonder': {
        if (!isMod && !isManager && !isAdmin) {
          return { basarili: false, hata: 'Kanal mesajı göndermek için yetkiniz yetersiz.' };
        }
        let hedefKanal = channel;
        if (parametreler.kanal) {
          const aranan = parametreler.kanal.toLowerCase().replace('#', '').trim();
          hedefKanal = guild.channels.cache.find(c => c.name.toLowerCase().includes(aranan)) || channel;
        }

        const mesajIcerik = parametreler.mesaj || parametreler.icerik || '';
        if (parametreler.embed_baslik) {
          const embed = kageEmbed({
            baslik: parametreler.embed_baslik,
            renk: TEMA.RENKLER.BILGI,
            aciklama: mesajIcerik,
            footer: `Kage AI Fermanı • ${member.displayName}`
          });
          await hedefKanal.send({ embeds: [embed] });
        } else if (mesajIcerik) {
          await hedefKanal.send(mesajIcerik);
        }

        return {
          basarili: true,
          detay: `${hedefKanal} kanalına mesaj başarıyla iletildi.`
        };
      }

      default:
        return { basarili: false, hata: `Tanınmayan eylem: ${eylem}` };
    }
  } catch (err) {
    console.error(`[AIAjan Hatası - ${eylem}]:`, err.message);
    return { basarili: false, hata: err.message };
  }
}

/**
 * ID, etiket veya kullanıcı adı üzerinden üyeyi bulur
 */
async function hedefUyeBul(guild, aranan) {
  if (!aranan) return null;
  const temizId = aranan.replace(/[<@!>]/g, '').trim();
  if (/^\d{17,20}$/.test(temizId)) {
    return await guild.members.fetch(temizId).catch(() => null);
  }
  const members = await guild.members.fetch({ limit: 100 }).catch(() => null);
  if (!members) return null;
  return members.find(m => 
    m.user.username.toLowerCase() === aranan.toLowerCase() ||
    m.displayName.toLowerCase() === aranan.toLowerCase() ||
    m.user.tag.toLowerCase() === aranan.toLowerCase()
  );
}
