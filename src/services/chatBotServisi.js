import { TEMA, kageEmbed, rastgeleSlogan } from '../config/tema.js';
import { bakiyeGetir } from './ekonomiServisi.js';

// ==========================================
// KELİME GRUPLARI & KALIPLAR
// ==========================================
const YETKI_TALEP = [
  'şunu yap', 'sunucuya ekle', 'rol aç', 'rol oluştur', 'rol ver', 'rol al',
  'kanal aç', 'kanal sil', 'kategori aç', 'kategori sil', 'banla', 'kickle',
  'sustur', 'mutele', 'temizle', 'sil', 'kural ekle', 'kuralları düzenle',
  'sunucuyu kur', 'sunucuyu sıfırla', 'admin yap', 'yetki ver', 'bana rol ver', 'botu kapat'
];

const RYO_EKONOMI = ['ryo nasıl kazanılır', 'para nasıl kasılır', 'para kazan', 'nasıl zengin olurum', 'ryo ne', 'ryo kasma', 'para kasmak', 'para kasma', 'ryo kas'];
const BAKIYE_PARAM = ['param ne kadar', 'param kaç', 'bakiyem ne', 'kaç ryo var', 'cüzdanım', 'fakir miyim', 'zengin miyim', 'param'];
const ZINDAN_REHBER = ['zindan taktiği', 'zindanda nasıl kazanırım', 'zindan nasıl oynanır', 'zindan ne', 'canavarlar', 'zindana nasıl girilir', 'zindan'];
const KUMAR_REHBER = ['kumar nasıl', 'blackjack nasıl', 'slot nasıl', 'kumar taktiği', 'kazanma taktiği', 'kumar', 'blackjack', 'slot', 'yazitura', 'yazı tura'];
const KATANA_DEMIRCI = ['demirci', 'katana', 'kılıç', 'kılıç nasıl güçlendirilir', 'en iyi kılıç', 'muramasa', 'gölge kılıcı', 'silah'];
const MANGA_OKU = ['manga nasıl okurum', 'yeni bölümler', 'manga sitesi', 'site adresi', 'link', 'website', 'manga oku', 'webtoon oku', 'site'];
const MANGA_ONERI = ['manga öner', 'ne okusam', 'güzel manga', 'manhwa öner', 'öneri', 'tavsiye', 'ne okuyayım'];
const ANIME_SOHBET = ['anime izle', 'anime öner', 'en iyi anime', 'anime', 'naruto', 'luffy', 'one piece', 'bleach', 'jujutsu', 'zoro'];
const KAYIT_OLMA = ['nasıl kayıt olunur', 'kayıt ol', 'kayıt nasıl', 'kayıt kapısı', 'kayıt'];
const KURALLAR = ['kurallar', 'kural ne', 'ceza var mı', 'yasak ne', 'spoiler kuralı', 'kurallar neler', 'kural'];
const ROLLER_UNVAN = ['rol nasıl', 'roller ne', 'hangi roller var', 'unvan', 'nasıl rol alırım', 'seviye rolü', 'unvanlar'];
const YETKILILER = ['yetkili kim', 'modlar kim', 'admin kim', 'şogun kim', 'moderatörler', 'daimyo'];
const KURUCU_SAHIP = ['yapımcın kim', 'sahibin kim', 'seni kim yaptı', 'geliştiricin kim', 'kim kodladı', 'kurucun kim', 'jagwey kim', 'jagwey', 'sahip kim'];
const SUNUCU_KALE = ['sunucu kimin', 'bu sunucu ne', 'sunucu hakkında', 'klan ne', 'kage kalesi', 'kaç kişiyiz', 'üye sayısı', 'sunucu nasıl'];

const TROLL_SEVGI = ['beni seviyor musun', 'sevgilin var mı', 'evlenelim mi', 'aşık mısın', 'öpücük ver', 'benimle çıkar mısın'];
const TROLL_ESPRI = ['şaka yap', 'fıkra anlat', 'güldür beni', 'komik bir şey söyle', 'espri yap', 'espri'];
const RAKIP_BOTLAR = ['mee6', 'dino', 'probot', 'carl', 'diğer botlar', 'owo', 'mudae'];
const KUFUR_HAKARET = ['aptal', 'salak', 'mal', 'gerizekalı', 'çöp bot', 'kötü bot', 'beceriksiz', 'orospu', 'piç', 'sikik'];
const FAL_SANS = ['şansım nasıl', 'fal bak', 'kaderim ne', 'bugün şanslı mıyım', 'fal'];
const PING_HIZ = ['ping', 'gecikme', 'hızlı mısın', 'ms kaç'];
const OVGU = ['adamsın', 'kral', 'harikasın', 'helal', 'sevdim seni', 'cansın', 'eyvallah', 'çok iyisin', 'harika'];
const YARDIM = ['yardım', 'komutlar', 'ne yapabilirsin', 'help', 'neler yaparsın', 'nasıl kullanılır'];

const HAL_HATIR = ['nasılsın', 'naber', 'ne haber', 'nasıl gidiyor', 'nörüyon', 'napıyon', 'ne yapıyorsun', 'iyisin', 'nasılsınız'];
const KULLANICI_IYI = ['iyiyim', 'ben de iyiyim', 'harikayım', 'süperim', 'bomba gibiyim', 'iyi çok şükür', 'fena değil'];
const KULLANICI_KOTU = ['kötüyüm', 'canım sıkkın', 'moralim bozuk', 'üzgünüm', 'keyfim yok', 'yoruldum', 'sıkıldım'];
const SELAMLAR = ['selam', 'merhaba', 'sa', 'selamun aleykum', 'hey', 'günaydın', 'iyi akşamlar', 'iyi geceler', 'selamlar', 'yo', 's.a', 'hello'];
const KIMLIK = ['kimsin', 'adın ne', 'nesin', 'sen kimsin', 'kendini tanıt', 'adın nedir', 'ne işe yararsın'];

const SAMURAY_SOZLERI = [
  '⛩️ *"Bir kılıç ustası gücünü kınından değil, sabrından alır."* Bir yardıma ihtiyacın olursa `/yardim` yazman yeterli!',
  '🥷 *"Gölgeler asla yalan söylemez."* Kage Kalesi\'nde yolunu bulmak için manga ve zindan komutlarımıza göz at.',
  '🌸 *"Kiraz çiçekleri rüzgarla savrulur ama gerçek bir savaşçı dimdik ayakta kalır."* kage95.com\'da yeni bölümlere göz atmayı unutma!',
  '🗡️ *"Karanlık çöktüğünde yalnızca en keskin katanalar parıldar."* Gücünü test etmek için `/zindan` yazabilirsin.',
  '🍵 *"Acele eden samuray kılıcını kınında unutur."* Sakin ol ve bir fincan yeşil çay eşliğinde `/rastgele-manga` oku.',
  '🏮 *"Onur bir kez kaybedilirse bin zafer bile onu geri getiremez."* Kage Kalesi\'nde saygınlığını koru genç ronin.'
];

function iceriyorMu(metin, kalipDizisi) {
  return kalipDizisi.some(kalip => {
    if (kalip.length <= 3) {
      const reg = new RegExp(`\\b${kalip}\\b`, 'i');
      return reg.test(metin);
    }
    return metin.includes(kalip);
  });
}

/**
 * Sunucu bağlamını ve kullanıcı verilerini içeren detaylı Kage Chat Bot yanıtı üretir.
 * @param {string} mesajMetni 
 * @param {import('discord.js').User} user 
 * @param {import('discord.js').Guild} guild 
 * @returns {import('discord.js').EmbedBuilder}
 */
export function chatBotYanitla(mesajMetni, user, guild = null) {
  const metin = (mesajMetni || '').trim().toLowerCase();
  const userName = user.username;
  const guildName = guild?.name || 'Kage Klanı';
  const memberCount = guild?.memberCount || 'yüzlerce';

  // Kullanıcı bakiye & kılıç verisi
  const bakiye = bakiyeGetir(user.id);
  const ryo = bakiye.ryo || 0;
  const kilicAd = bakiye.kilic?.ad || 'Tahta Katana';

  let baslik = '🗡️ KAGE CHAT BOT • Samuray Yanıtı';
  let aciklama = '';
  let renk = TEMA.RENKLER.BILGI;

  // 1. Yetki / Sunucu Yönetimi Talebi (KORUMA & HADDİNİ BİLDİRME)
  if (iceriyorMu(metin, YETKI_TALEP)) {
    baslik = '🚫 YETKİ REDDEDİLDİ • HADDİNİ BİL ÇEKİRGE!';
    renk = TEMA.RENKLER.HATA;
    aciklama = `**${userName}**, dur bakalım orada!\n\n` +
      `Ben sadece **Klan Liderim Şogun'un (Sunucu Yetkilisi)** emirlerini dinler ve yapay zeka mimarımı ona sunarım.\n\n` +
      `Normal kullanıcılar için sunucu yönetim yapay zekası devre dışıdır.\n` +
      `Sen katananı kuşanıp **/zindan**'a inebilir, **/blackjack** ile şansını deneyebilir veya **/manga** okuyabilirsin!`;
  }

  // 2. Ryo & Ekonomi Kasma
  else if (iceriyorMu(metin, RYO_EKONOMI)) {
    aciklama = `💰 **Ryo (Para) Nasıl Kazanılır?**\n\n` +
      `1. **/gunluk** : Her gün düzenli maaşını al! Seri (streak) yaptıkça bonus Ryo kazanırsın.\n` +
      `2. **/zindan** : İblisleri devir, 2000 Ryo'ya varan hazineleri kap!\n` +
      `3. **Sohbet Et** : Chatte yazdığın mesajlardan şans eseri 1 Ryo düşer.\n` +
      `4. **/blackjack** & **/slot** : Kumarcı masasında şansını 30x katla!`;
  }

  // 3. Bakiye & Cüzdan Sorgulama
  else if (iceriyorMu(metin, BAKIYE_PARAM)) {
    aciklama = `🪙 **Cüzdan Kontrolü:**\n\n` +
      `**${userName}**, şu an kesende tam **${ryo} Ryo** bulunuyor!\n` +
      `Ayrıca kınında kuşanılmış silahın: **${kilicAd}**.\n\n` +
      `Detaylı cüzdan dökümü için **/bakiye**, kimlik kartın için **/envanter** yazabilirsin.`;
  }

  // 4. Zindan Rehberi & Taktikler
  else if (iceriyorMu(metin, ZINDAN_REHBER)) {
    aciklama = `🏰 **Gizli Zindan Taktikleri:**\n\n` +
      `• Zindana girmeden önce **/demirci**'ye gidip katananı dövdür (hasarın %50 artar!).\n` +
      `• Canavarın atağını sezdiğinde **🛡️ Savun/Blok** yap; hasarın %75'ini emersin.\n` +
      `• Çantanda can iksiri bulundur.\n` +
      `• Canavar öldüğünde karşına çıkan 2 sandıktan birini seç; %50 şansla **Efsanevi Sandık (+%50 Ryo ve Garanti Eşya)** açılır!\n` +
      `• 30 saniye içinde kapı seçmezsen portal çöker ve 50 Ryo ceza yersin!`;
  }

  // 5. Kumar & Şans Oyunları
  else if (iceriyorMu(metin, KUMAR_REHBER)) {
    aciklama = `🎲 **Kumarcı Masaları (OwO Tarzı):**\n\n` +
      `• **/blackjack [bahis]** : Krupiyeye karşı 21 yap! 17 altında kalırsa kart çek, üstündeyse dur.\n` +
      `• **/slot [bahis]** : 3 kollu Samuray slotu! 3x Şogun Tacı tam **30 Katı** öder!\n` +
      `• **/yazitura [bahis] [seçim]** : 50/50 anında ikiye katlama şansı!`;
  }

  // 6. Katana & Demirci
  else if (iceriyorMu(metin, KATANA_DEMIRCI)) {
    aciklama = `⚔️ **Demirci & Katana Dövme:**\n\n` +
      `Şu an elinde: **${kilicAd}** var.\n` +
      `Paslı bir tahta kılıçla gerçek bir samuray olunmaz! **/demirci** komutuna git ve Ryo harcayarak kılıcını Efsanevi Gölge Kılıcı'na kadar yükselt!`;
  }

  // 7. Manga Nasıl Okurum & Site Linki
  else if (iceriyorMu(metin, MANGA_OKU)) {
    aciklama = `📖 **Resmi Manga Platformumuz:**\n\n` +
      `Tüm güncel manga, manhwa ve webtoon bölümlerini okumak için:\n` +
      `🔗 **[kage95.com](https://kage95.com)**\n\n` +
      `Discord içinden manga aramak için: \`/manga <isim>\`\n` +
      `Rastgele manga bulmak için: \`/rastgele-manga\``;
  }

  // 8. Manga Önerisi
  else if (iceriyorMu(metin, MANGA_ONERI)) {
    aciklama = `📚 **Kage Tavsiye Listesi:**\n\n` +
      `1. **Solo Leveling** : Gölge Hükümdarı'nın epik yükselişi.\n` +
      `2. **Vagabond** : Miyamoto Musashi'nin derin samuray felsefesi.\n` +
      `3. **Jujutsu Kaisen** & **Chainsaw Man** : Saf iblis avı ve aksiyon.\n` +
      `4. **Wind Breaker** : Efsanevi bisiklet & sokak yarışları.\n\n` +
      `Kişiselleştirilmiş tavsiye için: \`/oneri <tarz>\` yazabilirsin!`;
  }

  // 9. Anime Sohbeti
  else if (iceriyorMu(metin, ANIME_SOHBET)) {
    aciklama = `🍿 **Anime Muhabbeti:**\n\n` +
      `Samuray ruhunu iliklerine kadar hissetmek istiyorsan *Samurai Champloo*, *Bleach* veya *Dororo* izle.\n` +
      `Ama gerçek bir klan üyesi bölümleri önce **kage95.com** üzerinden mangasında okur!`;
  }

  // 10. Kayıt Nasıl Olunur
  else if (iceriyorMu(metin, KAYIT_OLMA)) {
    aciklama = `⛩️ **Kayıt İşlemi:**\n\n` +
      `Kalenin iç odalarına geçebilmek için **#kayıt-kapısı** kanalına gitmeli ve oradaki yeşil **Kayıt Ol** butonuna tıklamalısın!\n` +
      `İsmini girdiğin anda samuray rolün otomatik verilir ve tüm kanallar açılır.`;
  }

  // 11. Kurallar & Ceza
  else if (iceriyorMu(metin, KURALLAR)) {
    aciklama = `📜 **Kage Kalesi Samuray Kanunları:**\n\n` +
      `1. **Spoiler Yasağı:** Manga ve anime konuşurken kritik detayları \`||spoiler||\` etiketiyle gizleyeceksin.\n` +
      `2. **Saygı ve Onur:** Klan kardeşlerine ve yöneticilere hakaret etmek yasaktır.\n` +
      `3. **Spam & Reklam:** Kalede huzuru bozan kılıç darbeleriyle susturulur.\n\n` +
      `*Kurallara uymayanlar Şogun tarafından tek hamlede sürgün edilir!*`;
  }

  // 12. Roller & Unvanlar
  else if (iceriyorMu(metin, ROLLER_UNVAN)) {
    aciklama = `🥋 **Roller & Samuray Unvanları:**\n\n` +
      `• Sunucuda konuştukça ve zindan fethettikçe seviye atlarsın.\n` +
      `• **/market** komutunu kullanarak biriktirdiğin Ryo ile **'Gölge Suikastçısı'**, **'Başıboş Ronin'** veya **'Onurlu Daimyo'** unvanlarını satın alabilir ve **/profil**'inde sergileyebilirsin!`;
  }

  // 13. Yetkililer / Şogun
  else if (iceriyorMu(metin, YETKILILER)) {
    aciklama = `⚔️ **Klan Hiyerarşisi:**\n\n` +
      `Kalenin en tepesinde **Şogun (Jagwey)** ve Daimyo Meclisi (Yöneticiler) yer alır.\n` +
      `Bir şikayetin, önerin veya bot hatası olursa **/oneri** komutunu kullanabilirsin.`;
  }

  // 14. Kurucu / Geliştirici / Jagwey
  else if (iceriyorMu(metin, KURUCU_SAHIP)) {
    aciklama = `👑 Beni yüce klan liderimiz **Jagwey** kodladı!\n\n` +
      `Kendisi **[kage95.com](https://kage95.com)** platformunun baş mimarı, klanımızın Şogun'u ve bu Discord evreninin kurucusudur. Bu kalede onun samuray kanunları geçer!`;
  }

  // 15. Sunucu & Klan Bilgileri
  else if (iceriyorMu(metin, SUNUCU_KALE)) {
    aciklama = `🏯 Burası **${guildName}** Kalesi!\n\n` +
      `Şu an aramızda **${memberCount} samuray** bulunuyor. Kage manga okurları, oyuncular ve anime severler bu çatı altında toplanıyor.\n` +
      `Kalede rütbe atlamak için chatte aktif olabilir ve **/zindan** temizleyebilirsin!`;
  }

  // 16. Troll Sevgi / Evlilik
  else if (iceriyorMu(metin, TROLL_SEVGI)) {
    aciklama = `🌸 **${userName}**, kalbimin kını sadece katanama ve kage95 mangalarına aittir!\n\n` +
      `Ama seni klanımızın sadık bir neferi olarak yürekten takdir ediyorum. Gel zindana inelim, duygusallığı bırak!`;
  }

  // 17. Espri / Şaka
  else if (iceriyorMu(metin, TROLL_ESPRI)) {
    aciklama = `🎭 Samurayın biri bir gün kılıcını çekmiş... Karşıdaki adam 'Ne yapıyorsun?' diye sormuş.\n` +
      `Samuray da 'Ekran görüntüsü alıyorum' demiş! 😂\n\n` +
      `*Kılıç gibi soğuk bir espriydi, gölgelerde üşümeyesin samuray.*`;
  }

  // 18. Rakip Botlar (MEE6 vb.)
  else if (iceriyorMu(metin, RAKIP_BOTLAR)) {
    aciklama = `🗑️ MEE6 veya yabancı tüccar botları mı? Onları Kage Kalesi'ne sokmuyoruz bile!\n\n` +
      `Biz yerli, katanalı, manga odaklı ve yapay zeka destekli tek başımıza bir orduyuz!`;
  }

  // 19. Küfür & Hakaret
  else if (iceriyorMu(metin, KUFUR_HAKARET)) {
    renk = TEMA.RENKLER.UYARI_SARI;
    aciklama = `🥋 Sakin ol **${userName}**! Bir samurayın dili, kılıcından önce terbiye edilmelidir.\n\n` +
      `Kaba sözler katananı köreltir, ruhunu lekeleme. Saygını koru ve kılıcını kınına sok.`;
  }

  // 20. Fal & Şans
  else if (iceriyorMu(metin, FAL_SANS)) {
    const sansli = Math.random() < 0.6;
    aciklama = sansli
      ? `🔮 **Gölge Kehaneti:** Yıldızlar senin için parıldıyor **${userName}**! Bugün şans senden yana. Hemen bir **/blackjack** veya **/zindan** dene!`
      : `🔮 **Gölge Kehaneti:** Sisler biraz puslu... Bugün acele kararlar verme. Sakin sakin kage95.com'dan manga oku!`;
  }

  // 21. Ping & Hız
  else if (iceriyorMu(metin, PING_HIZ)) {
    aciklama = `⚡ Gölgelerden bile hızlıyım! Katananın havayı yarma hızı kadar seri çalışıyorum.`;
  }

  // 22. Övgü
  else if (iceriyorMu(metin, OVGU)) {
    aciklama = `🥋 Onur duydum, eyvallah **${userName}**! Kage klanı her zaman arkanda. Kılıcın asla körelmesin!`;
  }

  // 23. Yardım
  else if (iceriyorMu(metin, YARDIM)) {
    aciklama = `📜 Tüm sistemleri, oyunları, komutları ve linkleri görmek için **/yardim** yazabilirsin!`;
  }

  // 24. Hal Hatır / Naber / Nasılsın
  else if (iceriyorMu(metin, HAL_HATIR)) {
    aciklama = `🗡️ İyiyim çok şükür **${userName}**! Katanayı biledim, yeşil çayımı yudumluyorum, sen nasılsın?\n\n` +
      `**${guildName}** semalarında hava sakin, zindanlar ise kan ağlıyor! Kesende **${ryo} Ryo** ve elinde **${kilicAd}** görüyorum.\n` +
      `Bugün zindana inip birkaç iblis kellesi uçurdun mu bakalım?`;
  }

  // 25. Kullanıcının İyi Hali
  else if (iceriyorMu(metin, KULLANICI_IYI)) {
    aciklama = `🔥 Harika haber **${userName}**! Kılıcın gibi enerjin de pırıl pırıl parlıyor.\n\n` +
      `Bu yüksek moralle **/zindan**'a girsen iblislere tek atarsın! Ya da **/blackjack** masasına oturup krupiyeyi terletmeye ne dersin?`;
  }

  // 26. Kullanıcının Kötü Hali
  else if (iceriyorMu(metin, KULLANICI_KOTU)) {
    aciklama = `🍵 Ah be samuray **${userName}**... Bazen en sert fırtınalar bile diler, geriye sadece kökleri sağlam ağaçlar kalır.\n\n` +
      `Kılıcını bir kenara bırak, derin bir nefes al ve **[kage95.com](https://kage95.com)** kütüphanemizden kafa dağıtacak güzel bir manga oku.\n` +
      `Moralini bozma, Kage klanı her zaman seninle!`;
  }

  // 27. Selamlaşma
  else if (iceriyorMu(metin, SELAMLAR)) {
    aciklama = `⛩️ Selamlar samuray **${userName}**! **${guildName}** kalesine hoş geldin.\n\n` +
      `Kılıcın keskin, bahtın açık olsun. Zindan seferi, manga arama veya kumarcı köşesi için hazırım!`;
  }

  // 28. Kimlik / Sen Kimsin
  else if (iceriyorMu(metin, KIMLIK)) {
    aciklama = `🏮 Ben **Kage-95**!\n\n` +
      `**[kage95.com](https://kage95.com)** manga platformunun resmi gölge bekçisi, samuray rehberi ve topluluk asistanıyım.\n` +
      `Sunucuda manga arar, zindan savaşlarını yönetir, kumar masalarını kurar ve klan üyelerini korurum!`;
  }

  // 29. Boş veya Sadece "kage"
  else if (!metin || metin === 'kage') {
    aciklama = `Selam **${userName}**! Buyur kılıç kardeşim, beni mi çağırdın?\n\n` +
      `Şu an **${guildName}** kalesinde ${memberCount} samurayla birlikte nöbetteyim. Kesende **${ryo} Ryo** bulunuyor.\n` +
      `Bana merak ettiğin bir şeyi sorabilir veya **/yardim** yazarak tüm komutlarımı görebilirsin!`;
  }

  // 30. Genel Fallback (Rastgele Samuray Sözü + İpucu)
  else {
    const soz = SAMURAY_SOZLERI[Math.floor(Math.random() * SAMURAY_SOZLERI.length)];
    aciklama = `${soz}\n\n*${userName}, bana soru sorabilir, sunucu hakkında danışabilir veya \`/yardim\` ile yeteneklerime bakabilirsin.*`;
  }

  return kageEmbed({
    baslik,
    renk,
    aciklama,
    footer: `Kage-95 Chat Bot • ${guildName}`
  });
}
