import { ChannelType, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { TEMA, kageEmbed } from '../config/tema.js';
import { eskiKanallariTemizle, eskiRolleriTemizle, kageMimarisiInsaEt } from './sunucuMimarisiServisi.js';
import { ryoEkle } from './ekonomiServisi.js';
import { duyuruKanaliniBul } from './duyuruServisi.js';

/**
 * AI tarafından çağrılan Discord eylemlerini yetki kontrolüyle güvenli şekilde yürütür.
 */
export async function aiEylemiCalistir({ eylem, parametreler = {}, guild, channel, member, client }) {
  if (!guild || !member) {
    return { basarili: false, hata: 'Sunucu veya üye bağlamı bulunamadı.' };
  }

  const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);
  const isManager = member.permissions.has(PermissionFlagsBits.ManageGuild);
  const isMod = member.permissions.has(PermissionFlagsBits.ManageMessages);

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

        // Geçici kanalı sil
        setTimeout(async () => {
          try {
            const c = await guild.channels.fetch(cmdChanId).catch(() => null);
            if (c) await c.delete('AI Sıfırlama sonrası imha');
          } catch {}
        }, 5000);

        return {
          basarili: true,
          detay: 'Tüm eski kanallar ve roller silindi. Yeni Kage 95 mimarisi başarıyla inşa edildi! (Bu kanal 5 saniye içinde silinecektir)'
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

      // 3. Mesaj Silme (Bulk Delete)
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

      // 4. Yeni Kanal Oluşturma
      case 'kanal_olustur': {
        if (!isManager && !isAdmin) {
          return { basarili: false, hata: 'Kanal açmak için Kanalları Yönet yetkisi gereklidir.' };
        }
        const isim = (parametreler.isim || 'yeni-kanal').toLowerCase().replace(/\s+/g, '-');
        const tip = parametreler.tur === 'ses' ? ChannelType.GuildVoice : ChannelType.GuildText;
        const yeniKanal = await guild.channels.create({
          name: isim,
          type: tip,
          reason: 'Kage-95 AI talimatı'
        });
        return {
          basarili: true,
          detay: `${yeniKanal} kanalı başarıyla açıldı.`
        };
      }

      // 5. Kanal Silme
      case 'kanal_sil': {
        if (!isManager && !isAdmin) {
          return { basarili: false, hata: 'Kanal silmek için Kanalları Yönet yetkisi gereklidir.' };
        }
        let hedefKanal = null;
        if (parametreler.kanal_id) {
          hedefKanal = await guild.channels.fetch(parametreler.kanal_id).catch(() => null);
        } else if (parametreler.isim) {
          hedefKanal = guild.channels.cache.find(c => c.name.includes(parametreler.isim.toLowerCase()));
        }
        if (!hedefKanal) {
          return { basarili: false, hata: 'Silinecek kanal bulunamadı.' };
        }
        const silinenAd = hedefKanal.name;
        await hedefKanal.delete('Kage-95 AI talimatı');
        return {
          basarili: true,
          detay: `\`#${silinenAd}\` kanalı silindi.`
        };
      }

      // 6. Duyuru Yapma
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

        await duyuruKanali.send({ embeds: [embed] });
        return {
          basarili: true,
          detay: `Duyurunuz ${duyuruKanali} kanalında klan üyelerine ilan edildi.`
        };
      }

      // 7. Kullanıcı Susturma (Timeout)
      case 'kullanici_sustur': {
        if (!isMod && !isManager && !isAdmin) {
          return { basarili: false, hata: 'Üye susturmak için Moderatör yetkisi gerekir.' };
        }
        const target = await hedefUyeBul(guild, parametreler.kullanici);
        if (!target) return { basarili: false, hata: 'Hedef üye sunucuda bulunamadı.' };

        const dakika = parseInt(parametreler.dakika || 10, 10);
        const sebep = parametreler.sebep || 'Kage AI Veziri kararı';

        await target.timeout(dakika * 60 * 1000, sebep);
        return {
          basarili: true,
          detay: `${target} kullanıcısı ${dakika} dakika boyunca sessizliğe mahkum edildi. (Sebep: ${sebep})`
        };
      }

      // 8. Kullanıcı Atma (Kick)
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
          detay: `${target.user.tag} sunucudan sürüldü.`
        };
      }

      // 9. Kullanıcı Yasaklama (Ban)
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
          detay: `${target.user.tag} sunucudan ebediyen aforoz edildi (banlandı).`
        };
      }

      // 10. Rol Verme
      case 'rol_ver': {
        if (!member.permissions.has(PermissionFlagsBits.ManageRoles) && !isAdmin) {
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

      // 11. Rol Alma
      case 'rol_al': {
        if (!member.permissions.has(PermissionFlagsBits.ManageRoles) && !isAdmin) {
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

      // 12. Yavaş Mod Ayarla
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

      // 13. Kanal Kilitle / Aç
      case 'kilit_ayarla': {
        if (!isManager && !isAdmin) {
          return { basarili: false, hata: 'Kanal kilidi için Kanalları Yönet yetkisi gerekir.' };
        }
        const kilitle = parametreler.durum === 'kapat' || parametreler.durum === 'kilitle';
        await channel.permissionOverwrites.edit(guild.roles.everyone, {
          SendMessages: kilitle ? false : null
        });
        return {
          basarili: true,
          detay: kilitle ? 'Kanalın kapıları kilitlendi; üyelerin mesaj göndermesi engellendi.' : 'Kanalın kilidi açıldı; üyeler yeniden yazabilir.'
        };
      }

      // 14. Ryo Para Ekleme (Yönetici)
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
