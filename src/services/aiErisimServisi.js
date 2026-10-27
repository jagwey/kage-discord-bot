import { PermissionFlagsBits } from 'discord.js';
import { sunucuAyarGetir } from './veritabaniServisi.js';

// Kullanıcı başına spam/kötüye kullanım önleme hafızası (userId -> timestamp)
const sonKullaniciIstegi = new Map();

/**
 * Sunucu sahibi, OWNER_ID veya botun uygulama sahibi mi? Sahip her yetkiye sahiptir.
 */
export function sahipMi(member, client = null) {
  if (!member) return false;
  const userId = member.id || member.user?.id;
  const ownerId = process.env.OWNER_ID;
  if (ownerId && userId === ownerId) return true;
  if (member.guild && member.guild.ownerId === userId) return true;
  return client?.application?.owner?.id === userId;
}

/**
 * Kullanıcının sunucu yöneticisi veya bot sahibi olup olmadığını denetler.
 */
export function yetkiliMi(member, client = null) {
  if (!member) return false;
  const userId = member.id || member.user?.id;
  const ownerId = process.env.OWNER_ID;
  
  if (member.guild && member.guild.ownerId === userId) return true;
  if (ownerId && userId === ownerId) return true;
  if (client?.application?.owner?.id === userId) return true;
  if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
  if (member.permissions?.has(PermissionFlagsBits.ManageGuild)) return true;

  return false;
}

/**
 * Kullanıcının yapay zeka özelliklerini (sohbet, soru, çizim vb.) kullanma iznini kontrol eder.
 * 
 * @param {import('discord.js').GuildMember} member
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').Client} [client]
 * @returns {{ izin: boolean, sebep?: string, yetkili: boolean, aiRolId?: string }}
 */
export function aiErisimKontrol(member, guild, client = null) {
  // Yönetici ve sahipler her zaman tam yetkilidir
  if (yetkiliMi(member, client)) {
    return { izin: true, yetkili: true };
  }

  const ayarlar = sunucuAyarGetir(guild?.id);
  const aiMod = ayarlar.aiMod || process.env.AI_RESTRICT_MODE || 'sadece_rol';
  const aiRolId = ayarlar.aiRolId || process.env.AI_ROLE_ID || null;

  // 1. Mod: Yalnızca yöneticilere açık
  if (aiMod === 'sadece_yonetici') {
    return {
      izin: false,
      yetkili: false,
      sebep: '⛩️ **Yapay zeka gölge veziri şu anda sadece sunucu yöneticilerine ve yetkililere açıktır.**'
    };
  }

  // 2. Mod: Belirli role sahip olanlar (veya AI_ROLE_ID tanımlıysa)
  if (aiMod === 'sadece_rol' || aiRolId) {
    if (!aiRolId) {
      // Rol tanımlanmamışsa ama sadece_rol modu seçilmişse yöneticiler dışındakileri uyar
      return {
        izin: false,
        yetkili: false,
        sebep: '⛩️ **Yapay zeka erişimi sınırlandırılmıştır. Sunucu yöneticileri henüz bir AI rolü belirlemedi.**'
      };
    }

    const roleSahip = member?.roles?.cache?.has(aiRolId);
    if (!roleSahip) {
      return {
        izin: false,
        yetkili: false,
        aiRolId,
        sebep: `⛩️ **Yapay zeka gücünü kullanma yetkin bulunmuyor!**\nBu özelliği kullanabilmek için <@&${aiRolId}> rolüne sahip olmalısın.`
      };
    }
  }

  // 3. Mod: Herkese açık (veya rol şartını sağladı)
  return { izin: true, yetkili: false, aiRolId };
}

/**
 * Kullanıcı bazlı kötüye kullanım ve spam koruması (Cooldown/Rate-limit).
 * 
 * @param {string} userId
 * @param {number} [beklemeSn] Bekleme süresi (saniye)
 * @param {boolean} [yetkiliMuaf] Yöneticiler bekleme süresinden muaf mı
 * @returns {{ izin: boolean, kalanSaniye?: number, sebep?: string }}
 */
export function aiSpamKontrol(userId, beklemeSn = 8, yetkiliMuaf = false) {
  if (yetkiliMuaf) return { izin: true };

  const simdi = Date.now();
  const beklemeMs = beklemeSn * 1000;
  const sonIstek = sonKullaniciIstegi.get(userId) || 0;
  const gecen = simdi - sonIstek;

  if (gecen < beklemeMs) {
    const kalanSaniye = Math.ceil((beklemeMs - gecen) / 1000);
    return {
      izin: false,
      kalanSaniye,
      sebep: `⏱️ **Yavaş ol savaşçı!** Zihnimi toparlamam ve odaklanmam için **${kalanSaniye} saniye** sonra tekrar seslenmelisin.`
    };
  }

  sonKullaniciIstegi.set(userId, simdi);

  // Bellek temizliği (10 dakikadan eski kayıtları sil)
  if (sonKullaniciIstegi.size > 1000) {
    for (const [id, zaman] of sonKullaniciIstegi.entries()) {
      if (simdi - zaman > 600_000) sonKullaniciIstegi.delete(id);
    }
  }

  return { izin: true };
}
