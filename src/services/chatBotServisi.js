import { TEMA, kageEmbed, rastgeleSlogan } from '../config/tema.js';
import { bakiyeGetir, KILIC_SEVIYELERI } from './ekonomiServisi.js';
import { tumMangalariGetir } from './mangaServisi.js';

// ==========================================
// KELİME & NİYET TANIMA LİSTELERİ
// ==========================================
const YETKI_TALEP = [
  'şunu yap', 'sunucuya ekle', 'rol aç', 'rol oluştur', 'rol ver', 'rol al',
  'kanal aç', 'kanal sil', 'kategori aç', 'kategori sil', 'banla', 'kickle',
  'sustur', 'mutele', 'temizle', 'sil', 'kural ekle', 'kuralları düzenle',
  'sunucuyu kur', 'sunucuyu sıfırla', 'admin yap', 'yetki ver', 'bana rol ver', 'botu kapat'
];

const BENI_TANIYOR_MUSUN = ['beni tanıyor musun', 'ben kimim', 'profilim nasıl', 'hakkımda ne biliyorsun', 'beni analiz et', 'ben kimim ki', 'sicilim'];
const SITEDE_NE_VAR = ['sitede ne var', 'yeni mangalar', 'yeni bölümler', 'manga listesi', 'kütüphane', 'hangi mangalar var', 'son çıkanlar', 'trendler', 'site arşivi'];
const MANGA_ONERI = ['manga öner', 'ne okusam', 'güzel manga', 'manhwa öner', 'tavsiye', 'ne okuyayım', 'manga tavsiyesi', 'bana manga ver'];
const KILIC_DEMIRCI_DURUM = ['kılıcım', 'kılıcımı nasıl güçlendiririm', 'demirci', 'kılıç durumu', 'param kılıca yeter mi', 'katana güçlendir', 'muramasa', 'kılıç'];
const ZINDAN_SIMULASYON = ['zindana gireyim mi', 'zindanı geçer miyim', 'zindan taktiği', 'zindanda nasıl kazanırım', 'zindan rehberi', 'zindan ne', 'canavarlar', 'zindana nasıl girilir', 'zindan'];
const DULLO_KIMINLE = ['kiminle düello', 'düello kimi önerirsin', 'düello taktiği', 'düello', 'meydan oku', 'kime meydan okuyayım'];
const KUMAR_REHBER = ['kumar nasıl', 'blackjack nasıl', 'slot nasıl', 'kumar taktiği', 'kazanma taktiği', 'kumar', 'blackjack', 'slot', 'yazitura', 'yazı tura', 'bahis'];
const RYO_EKONOMI = ['ryo nasıl kazanılır', 'para nasıl kasılır', 'para kazan', 'nasıl zengin olurum', 'ryo ne', 'ryo kasma', 'para kasmak', 'para kasma', 'ryo kas'];
const BAKIYE_PARAM = ['param ne kadar', 'param kaç', 'bakiyem ne', 'kaç ryo var', 'cüzdanım', 'fakir miyim', 'zengin miyim', 'param'];
const SUNUCU_DURUMU = ['sunucu nasıl', 'kalede durumlar ne', 'sunucu durumu', 'kaç kişiyiz', 'sunucu kimin', 'klan ne', 'kage kalesi', 'üye sayısı', 'sunucu bilgisi'];
const KURALLAR = ['kurallar', 'kural ne', 'ceza var mı', 'yasak ne', 'spoiler kuralı', 'kurallar neler', 'kural'];
const KAYIT_OLMA = ['nasıl kayıt olunur', 'kayıt ol', 'kayıt nasıl', 'kayıt kapısı', 'kayıt'];
const ROLLER_UNVAN = ['rol nasıl', 'roller ne', 'hangi roller var', 'unvan', 'nasıl rol alırım', 'seviye rolü', 'unvanlar'];
const YETKILILER = ['yetkili kim', 'modlar kim', 'admin kim', 'şogun kim', 'moderatörler', 'daimyo'];
const KURUCU_SAHIP = ['yapımcın kim', 'sahibin kim', 'seni kim yaptı', 'geliştiricin kim', 'kim kodladı', 'kurucun kim', 'jagwey kim', 'jagwey', 'sahip kim'];
const BUSHIDO_FELSEFE = ['bushido', 'samuray yolu', 'felsefe yap', 'günün sözü', 'özlü söz', 'anlamlı söz', 'felsefe', 'öğüt ver'];
const FAL_SANS = ['falıma bak', 'şansım nasıl', 'fal bak', 'kaderim ne', 'bugün şanslı mıyım', 'fal', 'burcum ne', 'burç'];
const HAVA_DURUMU = ['hava nasıl', 'hava durumu', 'dışarıda hava nasıl'];
const TROLL_SEVGI = ['beni seviyor musun', 'sevgilin var mı', 'evlenelim mi', 'aşık mısın', 'öpücük ver', 'benimle çıkar mısın', 'canım'];
const TROLL_ESPRI = ['şaka yap', 'fıkra anlat', 'güldür beni', 'komik bir şey söyle', 'espri yap', 'espri'];
const RAKIP_BOTLAR = ['mee6', 'dino', 'probot', 'carl', 'diğer botlar', 'owo', 'mudae'];
const KUFUR_HAKARET = ['aptal', 'salak', 'mal', 'gerizekalı', 'çöp bot', 'kötü bot', 'beceriksiz', 'orospu', 'piç', 'sikik'];
const PING_HIZ = ['ping', 'gecikme', 'hızlı mısın', 'ms kaç'];
const OVGU = ['adamsın', 'kral', 'harikasın', 'helal', 'sevdim seni', 'cansın', 'eyvallah', 'çok iyisin', 'harika'];
const YARDIM = ['yardım', 'komutlar', 'ne yapabilirsin', 'help', 'neler yaparsın', 'nasıl kullanılır'];

const HAL_HATIR = ['nasılsın', 'naber', 'ne haber', 'nasıl gidiyor', 'nörüyon', 'napıyon', 'ne yapıyorsun', 'iyisin', 'nasılsınız'];
const KULLANICI_IYI = ['iyiyim', 'ben de iyiyim', 'harikayım', 'süperim', 'bomba gibiyim', 'iyi çok şükür', 'fena değil'];
const KULLANICI_KOTU = ['kötüyüm', 'canım sıkkın', 'moralim bozuk', 'üzgünüm', 'keyfim yok', 'yoruldum', 'sıkıldım'];
const SELAMLAR = ['selam', 'merhaba', 'sa', 'selamun aleykum', 'hey', 'günaydın', 'iyi akşamlar', 'iyi geceler', 'selamlar', 'yo', 's.a', 'hello'];
const KIMLIK = ['kimsin', 'adın ne', 'nesin', 'sen kimsin', 'kendini tanıt', 'adın nedir', 'ne işe yararsın'];

const SAMURAY_SOZLERI = [
  '⛩️ *"Bir kılıç ustası gücünü kınından değil, sabrından alır."* — Miyamoto Musashi',
  '🥷 *"Gölgeler asla yalan söylemez. Rüzgar eser, yaprak düşer ama onur sonsuza dek yaşar."*',
  '🌸 *"Kiraz çiçekleri rüzgarla savrulur ama gerçek bir samuray fırtınanın gözünde bile dimdik durur."*',
  '🗡️ *"Karanlık çöktüğünde yalnızca en keskin katanalar parıldar. Zihnini sustur, kılıcını dinle."*',
  '🍵 *"Acele eden savaşçı kılıcını kınında unutur. Sakin ol, nefes al ve bir fincan yeşil çay iç."*',
  '🏮 *"Bin zafer kazansan bile alçakgönüllülüğü elden bırakırsan tek bir darbeyle devrilirsin."* — Hagakure'
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
 * Kullanıcı kimliği ve güne göre deterministik fal üretir
 */
function gunlukFalUret(userId) {
  const bugun = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < (userId + bugun).length; i++) {
    hash = (hash << 5) - hash + (userId + bugun).charCodeAt(i);
    hash |= 0;
  }
  const sansYuzde = Math.abs(hash % 71) + 30; // %30 - %100 arası
  const ruhlar = [
    { ad: '🐅 Kızıl Kaplan Ruhu', desc: 'Zindanlarda canavarları parçalayacak vahşi bir enerji var içinde!' },
    { ad: '🐉 Gölge Ejderi Ruhu', desc: 'Bugün kumarda ve kılıç dövüşünde altın oranın zirvesindesin.' },
    { ad: '🐺 Ak Kurt Ruhu', desc: 'Sakin ve ölümcül. Pusu kurup büyük ödülleri toplayacağın bir gün.' },
    { ad: '🦅 Gök Tengu Ruhu', desc: 'Çevikliğin tavan yapmış. Zindanda kaçış ve blok hamlelerin tutacak.' },
    { ad: '🎋 Kadim Bambu Ruhu', desc: 'Kırılmaz bir sabır. Bugün riskli hareketler yerine Ryo biriktirmeye odaklan.' }
  ];
  const ruh = ruhlar[Math.abs(hash % ruhlar.length)];
  return { sansYuzde, ruh };
}

/**
 * Dünyanın en detaylı, canlı veritabanı ve üye istihbaratlı Kage Chat Botu.
 * @param {string} mesajMetni 
 * @param {import('discord.js').User} user 
 * @param {import('discord.js').Guild} guild 
 * @param {import('discord.js').GuildMember} member 
 * @returns {Promise<import('discord.js').EmbedBuilder>}
 */
export async function chatBotYanitla(mesajMetni, user, guild = null, member = null) {
  const metin = (mesajMetni || '').trim().toLowerCase();
  const userName = member?.displayName || user.username;
  const guildName = guild?.name || 'Kage Klanı';
  const memberCount = guild?.memberCount || 'yüzlerce';
  const siteUrl = process.env.SITE_URL || 'https://kage95.com';

  // Canlı Üye Verileri
  const bakiye = bakiyeGetir(user.id);
  const ryo = bakiye.ryo || 0;
  const banka = bakiye.banka || 0;
  const streak = bakiye.streak || 0;
  const kilic = bakiye.kilic || KILIC_SEVIYELERI[0];
  const unvan = bakiye.unvan || 'Acemi Samuray';
  const duelloZafer = bakiye.duelloZafer || 0;
  const duelloMaglubiyet = bakiye.duelloMaglubiyet || 0;
  const zindanZafer = bakiye.zindanZafer || 0;
  const envanter = bakiye.envanter || [];

  // Üyenin katılım süresi
  let katilimMetni = 'Kalede yenisin';
  if (member?.joinedTimestamp) {
    const gecenGun = Math.floor((Date.now() - member.joinedTimestamp) / (1000 * 60 * 60 * 24));
    katilimMetni = gecenGun === 0 ? 'Bugün katıldın' : `Tam **${gecenGun} gündür** aramızdasın`;
  }

  // Üye Rolleri
  let rollerMetni = 'Normal Samuray';
  if (member?.roles?.cache) {
    const onemliRoller = member.roles.cache
      .filter(r => r.name !== '@everyone')
      .map(r => r.name)
      .slice(0, 3);
    if (onemliRoller.length > 0) {
      rollerMetni = onemliRoller.join(' • ');
    }
  }

  let baslik = '🗡️ KAGE CHAT BOT • Samuray Yanıtı';
  let aciklama = '';
  let renk = TEMA.RENKLER.BILGI;
  let alanlar = [];

  // =========================================================================
  // 1. GÜVENLİK / YETKİ TALEBİ KORUMASI
  // =========================================================================
  if (iceriyorMu(metin, YETKI_TALEP)) {
    baslik = '🚫 YETKİ REDDEDİLDİ • HADDİNİ BİL ÇEKİRGE!';
    renk = TEMA.RENKLER.HATA;
    aciklama = `**${userName}**, dur bakalım orada!\n\n` +
      `Ben sadece **Klan Liderim Şogun'un (Sunucu Yetkilisi)** emirlerini dinler ve yapay zeka mimarımı ona sunarım.\n\n` +
      `Normal kullanıcılar için sunucu yönetim yapay zekası devre dışıdır.\n` +
      `Sen katananı kuşanıp **/zindan**'a inebilir, **/blackjack** ile şansını deneyebilir veya **/manga** okuyabilirsin!`;
  }

  // =========================================================================
  // 2. KULLANICI RÖNTGENİ: "BENİ TANIYOR MUSUN? / BEN KİMİM?"
  // =========================================================================
  else if (iceriyorMu(metin, BENI_TANIYOR_MUSUN)) {
    baslik = `🕵️‍♂️ İSTİHBARAT RAPORU • ${userName.toUpperCase()}`;
    renk = TEMA.RENKLER.KAN_KIRMIZISI;
    const boosterMi = member?.premiumSince ? '⭐ **KALE BOOSTÇUSU (Nitro Destekçisi)**' : 'Klanın Sadık Neferi';
    const envanterOzet = envanter.length > 0 ? envanter.join(', ') : '*Çantan şu an bomboş, zindandan eşya düşür!*';

    aciklama = `Seni tanımaz mıyım **${userName}**? Kage İstihbarat Arşivlerini açtım, işte senin samuray sicilin:\n\n` +
      `🏰 **Kaledeki Kıdemin:** ${katilimMetni} (${boosterMi})\n` +
      `🏷️ **Rütbelerin:** \`${rollerMetni}\`\n` +
      `🥋 **Unvanın:** **${unvan}**\n\n` +
      `⚔️ **Savaş ve Silah Karnen:**\n` +
      `• Kuşanılan Katana: **${kilic.ad}** (+%${kilic.bonus} Hasar Bonusu)\n` +
      `• Zindan Zaferleri: **${zindanZafer} Fetih**\n` +
      `• Düello Sicili: **${duelloZafer} Zafer** / **${duelloMaglubiyet} Mağlubiyet**\n\n` +
      `💰 **Finansal Durumun:**\n` +
      `• Cüzdan: \`${ryo} Ryo\` | Banka: \`${banka} Ryo\` | Maaş Serisi: \`${streak} Gün\`\n\n` +
      `🎒 **Çandaki Eşyalar:**\n${envanterOzet}`;
  }

  // =========================================================================
  // 3. CANLI SİTE VERİSİ: "SİTEDE NE VAR? / YENİ MANGALAR"
  // =========================================================================
  else if (iceriyorMu(metin, SITEDE_NE_VAR)) {
    baslik = '📖 KAGE95.COM CANLI KÜTÜPHANE VERİSİ';
    renk = TEMA.RENKLER.BILGI;
    try {
      const mangalar = await tumMangalariGetir();
      if (mangalar.length > 0) {
        const sonUc = mangalar.slice(0, 4);
        const listeMetni = sonUc.map((m, i) => 
          `**${i + 1}. [${m.mangaAdi}](${siteUrl}/manga/${m.id})**\n` +
          `🏷️ Tür: *${(m.kategoriler || []).slice(0, 3).join(', ') || 'Genel'}* | 👁️ Okunma: \`${m.okunmaSayisi || 0}\``
        ).join('\n\n');

        aciklama = `Canlı **[kage95.com](${siteUrl})** sunucularına bağlandım! Şu an kütüphanemizde toplam **${mangalar.length} manga serisi** yayında.\n\n` +
          `🔥 **Öne Çıkan & Son Eklenen Seriler:**\n\n${listeMetni}\n\n` +
          `*İstediğin manganın detayını görmek için Discord'da \`/manga <isim>\` yazabilirsin!*`;
      } else {
        aciklama = `Şu an canlı sitemizde **[kage95.com](${siteUrl})** onlarca manga yayında! Hemen sitemize girip okuyabilirsin.`;
      }
    } catch {
      aciklama = `Sitemiz **[kage95.com](${siteUrl})** üzerinden tüm manga ve webtoonları okuyabilirsin!`;
    }
  }

  // =========================================================================
  // 4. CANLI VERİDEN KİŞİYE ÖZEL MANGA TAVSİYESİ
  // =========================================================================
  else if (iceriyorMu(metin, MANGA_ONERI)) {
    baslik = '📚 SENİN İÇİN ÖZEL SEÇİLEN MANGA';
    renk = TEMA.RENKLER.BASARI;
    try {
      const mangalar = await tumMangalariGetir();
      if (mangalar.length > 0) {
        const secilen = mangalar[Math.floor(Math.random() * mangalar.length)];
        const kategoriStr = (secilen.kategoriler || []).join(', ') || 'Aksiyon, Samuray';
        const aciklamaKisa = secilen.aciklama ? secilen.aciklama.slice(0, 220) + '...' : 'Efsanevi sürükleyici bir macera!';

        aciklama = `Senin için kage95.com kütüphanesinden özel bir seri seçtim **${userName}**:\n\n` +
          `📖 **[${secilen.mangaAdi}](${siteUrl}/manga/${secilen.id})**\n` +
          `🏷️ **Tür:** *${kategoriStr}*\n` +
          `✍️ **Yazar/Çizer:** \`${secilen.yazar || 'Kage Ekibi'}\`\n\n` +
          `📜 **Özet:**\n*"${aciklamaKisa}"*\n\n` +
          `👉 **[Buraya Tıklayarak Sitede Hemen Oku](${siteUrl}/manga/${secilen.id})** ya da Discord'da \`/manga ${secilen.mangaAdi}\` yaz!`;
      } else {
        aciklama = `Hemen **Solo Leveling** veya **Vagabond** oku samuray! Tam sana göre. Sitede okumak için: **[kage95.com](${siteUrl})**`;
      }
    } catch {
      aciklama = `Sitemiz **[kage95.com](${siteUrl})** üzerinden **High School DXD**, **Solo Leveling** ve **Vagabond** okuyabilirsin!`;
    }
  }

  // =========================================================================
  // 5. KILIÇ ANALİZİ: "KILIÇLAR / DEMİRCİ / GÜÇLENDİREYİM Mİ?"
  // =========================================================================
  else if (iceriyorMu(metin, KILIC_DEMIRCI_DURUM)) {
    baslik = '⚔️ DEMİRCİ & KATANA EKSPERTİZ RAPORU';
    renk = TEMA.RENKLER.KAN_KIRMIZISI;
    const mevcutSeviye = kilic.seviye || 1;
    const sonraki = KILIC_SEVIYELERI.find(k => k.seviye === mevcutSeviye + 1);

    if (!sonraki) {
      aciklama = `👑 **MUHTEŞEM!** Zaten elinde kaledeki en yüksek silah olan **${kilic.ad}** bulunuyor!\n` +
        `Kılıcın savaşlarda ve zindanda sana **+%50 Nihai Hasar Bonusu** sağlıyor. Şogun seviyesindesin!`;
    } else {
      const fark = sonraki.maliyet - ryo;
      const durumMesaji = fark <= 0
        ? `🎉 **MÜJDE!** Kesende tam **${ryo} Ryo** var, yani demirciye verecek paran FAZLASIYLA YETİYOR!\n` +
          `Hemen **/demirci** komutunu yaz ve katananı dövdür!`
        : `⚠️ Bir sonraki seviye için henüz paran yetmiyor. **${fark} Ryo** daha biriktirmelisin!\n` +
          `Para kasmak için hemen **/zindan** fethine çık ya da **/gunluk** maaşını al!`;

      aciklama = `Katananı inceledim **${userName}**:\n\n` +
        `🗡️ **Mevcut Silahın:** **${kilic.ad}** (+%${kilic.bonus} Hasar)\n` +
        `⬆️ **Sıradaki Kademe:** **${sonraki.ad}** (+%${sonraki.bonus} Hasar)\n` +
        `💰 **Demircinin İstediği Ücret:** \`${sonraki.maliyet} Ryo\`\n` +
        `🪙 **Senin Cüzdanın:** \`${ryo} Ryo\`\n\n` +
        `${durumMesaji}`;
    }
  }

  // =========================================================================
  // 6. ZİNDAN SİMÜLASYONU: "ZİNDANA GİREYİM Mİ? / GEÇER MİYİM?"
  // =========================================================================
  else if (iceriyorMu(metin, ZINDAN_SIMULASYON)) {
    baslik = '🏰 ZİNDAN SEFERİ SİMÜLASYONU & TAKTİKLER';
    renk = TEMA.RENKLER.KAN_KIRMIZISI;
    const iksirVar = envanter.some(e => e.toLowerCase().includes('iksir'));
    const iksirUyarisi = iksirVar 
      ? '🧪 Çantanda can iksiri var, kritik anlarda hayatını kurtarabilir!' 
      : '⚠️ Çantanda can iksiri YOK! Savaşta acil can basmak için en az 50 Ryo bulundur.';

    aciklama = `Karakterini ve zindan tehlikelerini tarttım **${userName}**:\n\n` +
      `🗡️ **Silah Gücün:** ${kilic.ad} (+%${kilic.bonus})\n` +
      `🏆 **Geçmiş Zaferlerin:** ${zindanZafer} zindan fethi\n` +
      `${iksirUyarisi}\n\n` +
      `🎯 **Derece Tahmini:**\n` +
      `• 🟢 **D & C Rank (Torii Geçidi, Bambu Ormanı):** Bu yaratıkları rahatlıkla devirirsin.\n` +
      `• 🟠 **B-Rank (Harabe Şogun Kalesi):** Oni iblisi çok sert vurur. Canavar sana hamle yaptığında mutlaka **🛡️ Savun/Blok** yap!\n` +
      `• 🔴 **A-Rank (Magma Tapınağı):** Çok riskli! Ama kazanırsan 2000 Ryo kaparsın.\n\n` +
      `⚠️ **Unutma:** Karşına 3 kapı açıldığında **30 saniye** içinde seçmezsen portal çöker ve kesenden 50 Ryo ceza gider!\n` +
      `Hazırsan hemen **/zindan** yaz ve savaşı başlat!`;
  }

  // =========================================================================
  // 7. DÜELLO TAVSİYESİ: "KİMİNLE DÜELLO ATAYIM?"
  // =========================================================================
  else if (iceriyorMu(metin, DULLO_KIMINLE)) {
    baslik = '⚔️ DÜELLO MEYDAN OKUMA TAKTİĞİ';
    renk = TEMA.RENKLER.KAN_KIRMIZISI;
    aciklama = `Kılıcına kan mı arıyorsun **${userName}**?\n\n` +
      `Düello karnen: **${duelloZafer} Galibiyet / ${duelloMaglubiyet} Mağlubiyet**.\n` +
      `Kuşandığın **${kilic.ad}** düellolarda sana rakiplerine karşı **+%${kilic.bonus} hasar avantajı** veriyor!\n\n` +
      `💡 **Tavsiyem:** Chatte katanası tahta olan acemi bir samuray gözüne kestir ve **/duello @rakip [bahis]** yazarak meydan oku. Parasını alıp kaçarsın!`;
  }

  // =========================================================================
  // 8. GÜNLÜK SAMURAY FALI & ŞANS ANALİZİ
  // =========================================================================
  else if (iceriyorMu(metin, FAL_SANS)) {
    baslik = `🔮 GÖLGE ASTROLOJİSİ • ${userName.toUpperCase()} FALI`;
    renk = TEMA.RENKLER.BILGI;
    const { sansYuzde, ruh } = gunlukFalUret(user.id);

    aciklama = `Kadim gölge aynasına baktım ve senin bugünkü yıldız haritanı çıkardım **${userName}**:\n\n` +
      `✨ **Bugünkü Samuray Ruhun:** ${ruh.ad}\n` +
      `📜 *"${ruh.desc}"*\n\n` +
      `📊 **Günün Şans Skoru:** \`%${sansYuzde}\`\n\n` +
      (sansYuzde >= 70
        ? `🔥 **Şans Tavan Yapmış!** Kumarda krupiyeyi batıracak bir el yakalayabilirsin, hemen **/blackjack** veya **/slot** dene!`
        : `🍵 **Temkinli Ol!** Bugün açgözlülük yapma, zindana inerken dikkatli ol ve katananı demircide döv!`);
  }

  // =========================================================================
  // 9. SUNUCU & KLAN ANALİZİ: "SUNUCU NASIL? / KALEDE DURUMLAR NE?"
  // =========================================================================
  else if (iceriyorMu(metin, SUNUCU_DURUMU)) {
    baslik = `🏯 KLAN RAPORU • ${guildName.toUpperCase()} KALESİ`;
    renk = TEMA.RENKLER.BILGI;
    const kanalSayisi = guild?.channels?.cache?.size || 15;
    const boostSayisi = guild?.premiumSubscriptionCount || 0;
    const kurucuEtiket = guild?.ownerId ? `<@${guild.ownerId}>` : 'Jagwey';

    aciklama = `Kaledeki nöbet kulesinden tüm sunucuyu taradım **${userName}**:\n\n` +
      `👥 **Nöbetteki Samuray Sayısı:** **${memberCount} klan üyesi**\n` +
      `🏮 **Kale Odaları & Kanallar:** \`${kanalSayisi} aktif kanal\`\n` +
      `💎 **Klan Gücü (Boost):** \`${boostSayisi} Takviye\`\n` +
      `👑 **Kalenin Yüce Şogun'u:** ${kurucuEtiket}\n\n` +
      `Kalede asayiş berkemal, gölge veziri nöbette ve manga kütüphanemiz 7/24 hizmetinizde!`;
  }

  // =========================================================================
  // 10. BUSHİDO & SAMURAY FELSEFESİ
  // =========================================================================
  else if (iceriyorMu(metin, BUSHIDO_FELSEFE)) {
    baslik = '⛩️ BUSHIDO • SAMURAYIN KADİM YOLU';
    renk = TEMA.RENKLER.BILGI;
    const ozluSoz = SAMURAY_SOZLERI[Math.floor(Math.random() * SAMURAY_SOZLERI.length)];
    aciklama = `Bir samurayın en büyük savaşı kendi zihnindedir **${userName}**.\n\n` +
      `${ozluSoz}\n\n` +
      `*Bushido'nun 7 erdemi: Onur, Cesaret, Saygı, Sadakat, Dürüstlük, Merhamet ve Adalet. Kılıcını bu erdemlerle taşı.*`;
  }

  // =========================================================================
  // 11. HAVA DURUMU (ANİME / SAMURAY TEMALI)
  // =========================================================================
  else if (iceriyorMu(metin, HAVA_DURUMU)) {
    baslik = '🌸 KAGE KALESİ HAVA RAPORU';
    renk = TEMA.RENKLER.BILGI;
    aciklama = `Kalenin surlarına çıkıp rüzgarı dinledim **${userName}**:\n\n` +
      `Gökyüzü hafif sisli, rüzgar kiraz çiçeği yapraklarını savuruyor ve hava sıcaklığı tam katanayı kınından çıkarmalık 18 derece!\n\n` +
      `Zindana inip iblis avlamak ya da sıcak bir çay eşliğinde **[kage95.com](${siteUrl})** mangası okumak için harika bir hava!`;
  }

  // =========================================================================
  // 12. RYO VE EKONOMİ
  // =========================================================================
  else if (iceriyorMu(metin, RYO_EKONOMI)) {
    baslik = '💰 RYO (PARA) KAZANMA REHBERİ';
    renk = TEMA.RENKLER.BASARI;
    aciklama = `**${userName}**, Kage kalesinde zengin olmanın 4 altın yolu vardır:\n\n` +
      `1. **/gunluk** : 24 saatte bir düzenli maaşını al! Seri (streak) yaptıkça bonus Ryo katlanır.\n` +
      `2. **/zindan** : 3 kapıdan birini seçip iblisleri kes, tek seferde 2000 Ryo'ya kadar hazine yağmala!\n` +
      `3. **Chatte Aktif Ol** : Sohbette yazdığın her mesajdan %25 şansla yere 1 Ryo düşer.\n` +
      `4. **/blackjack** & **/slot** : Kumarcı masasında paranı 30 katına kadar çıkarabilirsin!\n\n` +
      `Şu an kesende **${ryo} Ryo** var. Hemen harekete geç!`;
  }

  // =========================================================================
  // 13. CÜZDAN & BAKİYE
  // =========================================================================
  else if (iceriyorMu(metin, BAKIYE_PARAM)) {
    baslik = `🪙 CÜZDAN DÖKÜMÜ • ${userName.toUpperCase()}`;
    renk = TEMA.RENKLER.BASARI;
    aciklama = `Hemen keseni yokladım **${userName}**:\n\n` +
      `💰 **Nakit Cüzdanın:** \`${ryo} Ryo\`\n` +
      `🏦 **Banka Kasan:** \`${banka} Ryo\`\n` +
      `🗡️ **Kuşandığın Silah:** **${kilic.ad}** (+%${kilic.bonus} Hasar)\n` +
      `🔥 **Maaş Serisi:** \`${streak} Gün\`\n\n` +
      `Daha detaylı kimlik kartın için **/envanter**, hesap dökümü için **/bakiye** yazabilirsin!`;
  }

  // =========================================================================
  // 14. KUMAR & OWO ŞANS OYUNLARI
  // =========================================================================
  else if (iceriyorMu(metin, KUMAR_REHBER)) {
    baslik = '🎲 KUMARCI MASALARI REHBERİ';
    renk = TEMA.RENKLER.BILGI;
    aciklama = `Şansına güveniyor musun **${userName}**?\n\n` +
      `• **/blackjack [bahis]** : Krupiyeye karşı kart çek veya dur. Krupiye 17 altında kalırsa kart çekmek zorundadır, taktiğini ona göre kur!\n` +
      `• **/slot [bahis]** : 3 makaralı samuray çarkı! 3x Şogun Tacı denk gelirse tam **30 KATINI** öder!\n` +
      `• **/yazitura [bahis] [seçim]** : 50/50 anında ikiye katlama klasiği.\n\n` +
      `*Unutma samuray: Açgözlülük kılıcı köreltir, kasa her zaman kazanmak ister!*`;
  }

  // =========================================================================
  // 15. KURALLAR & CEZALAR
  // =========================================================================
  else if (iceriyorMu(metin, KURALLAR)) {
    baslik = '📜 KAGE KALESİ SAMURAY KANUNLARI';
    renk = TEMA.RENKLER.KAN_KIRMIZISI;
    aciklama = `Kalede huzur ve onuru korumak için şu kurallara riayet edilir:\n\n` +
      `1. **Spoiler Yasaktır:** Manga ve anime konuşurken kritik sahneleri mutlaka \`||spoiler||\` içine alacaksın.\n` +
      `2. **Klan Saygısı:** Samuray kardeşlerine, klan büyüklerine ve yöneticilere saygısızlık yapılmaz.\n` +
      `3. **Spam & Reklam:** Çöp mesaj atanlar gölgelerin içinde sessizce susturulur.\n\n` +
      `*Uymayanlar Şogun tarafından tek vuruşta kaleden sürgün edilir!*`;
  }

  // =========================================================================
  // 16. KAYIT OLMA REHBERİ
  // =========================================================================
  else if (iceriyorMu(metin, KAYIT_OLMA)) {
    baslik = '⛩️ KALE KAPISI & KAYIT İŞLEMİ';
    renk = TEMA.RENKLER.BASARI;
    aciklama = `Kalenin iç odalarına geçmek çok kolay **${userName}**:\n\n` +
      `1. **#kayıt-kapısı** kanalına git.\n` +
      `2. Oradaki yeşil **Kayıt Ol** butonuna tıkla.\n` +
      `3. İsmini gir ve onayla!\n\n` +
      `Saniyeler içinde samuray rolün verilecek ve tüm sohbet odaları açılacaktır.`;
  }

  // =========================================================================
  // 17. ROLLER & UNVANLAR
  // =========================================================================
  else if (iceriyorMu(metin, ROLLER_UNVAN)) {
    baslik = '🥋 KLAN ROLLERİ VE UNVANLARI';
    renk = TEMA.RENKLER.BILGI;
    aciklama = `**${userName}**, kalede rütbe atlamak için:\n\n` +
      `• Chatte konuştukça ve zindan fethettikçe seviye atlar, yeni klan rolleri kazanırsın.\n` +
      `• **/market** komutunu açıp biriktirdiğin Ryo ile **'Gölge Suikastçısı'**, **'Başıboş Ronin'** veya **'Onurlu Daimyo'** unvanlarını satın alabilirsin!\n` +
      `• Unvanın **/profil** ve **/envanter** kartında gururla görünür.`;
  }

  // =========================================================================
  // 18. YETKİLİLER / ŞOGUN MECLİSİ
  // =========================================================================
  else if (iceriyorMu(metin, YETKILILER)) {
    baslik = '⚔️ KLAN YÖNETİMİ & ŞOGUN MECLİSİ';
    renk = TEMA.RENKLER.BILGI;
    aciklama = `Kalenin yönetim kademesi şu şekildedir:\n\n` +
      `👑 **Şogun (Jagwey)** : Kalenin kurucusu, botun ve kage95.com'un yaratıcısı.\n` +
      `🏮 **Daimyo Meclisi** : Sunucu yöneticileri ve düzeni sağlayan komutanlar.\n` +
      `🥷 **Gölge Veziri (Ben)** : 7/24 nöbet tutan yapay zeka asistanı.\n\n` +
      `Bir sorun yaşarsan **/oneri** komutuyla doğrudan yetkililere not bırakabilirsin!`;
  }

  // =========================================================================
  // 19. GELİŞTİRİCİ / JAGWEY
  // =========================================================================
  else if (iceriyorMu(metin, KURUCU_SAHIP)) {
    baslik = '👑 BAŞMİMAR • JAGWEY';
    renk = TEMA.RENKLER.KAN_KIRMIZISI;
    aciklama = `Beni bu klanın lideri **Jagwey** kodladı!\n\n` +
      `Kendisi hem **[kage95.com](https://kage95.com)** platformunun mimarı hem de beni gölgelerden uyandırıp bu sunucuya bekçi yapan başmühendistir. Bu kalede onun samuray kanunları geçer!`;
  }

  // =========================================================================
  // 20. TROLL SEVGİ / AŞK / EVLİLİK
  // =========================================================================
  else if (iceriyorMu(metin, TROLL_SEVGI)) {
    baslik = '🌸 SAMURAY AŞKI';
    renk = TEMA.RENKLER.BILGI;
    aciklama = `**${userName}**, kalbimin kını sadece katanama ve kage95 mangalarına aittir!\n\n` +
      `Ama seni klanımızın sadık ve onurlu bir neferi olarak yürekten seviyorum. Duygusallığı bir kenara bırakalım da gel seninle bir zindana inip iblis avlayalım!`;
  }

  // =========================================================================
  // 21. ESPRİ / ŞAKA / FIKRA
  // =========================================================================
  else if (iceriyorMu(metin, TROLL_ESPRI)) {
    baslik = '🎭 KAGE KOMEDİ KÖŞESİ';
    renk = TEMA.RENKLER.BILGI;
    const espriler = [
      `Samurayın biri bir gün kılıcını çekmiş... Karşıdaki adam 'Ne yapıyorsun?' diye sormuş.\nSamuray da 'Ekran görüntüsü alıyorum' demiş! 😂`,
      `Ninja bir gün bakkala gitmiş, 'Bana bir ekmek ver ama kimse görmesin' demiş! 🥷`,
      `Kılıç ustasına sormuşlar: 'Neden sürekli katananı biliyorsun?'\nUsta cevap vermiş: 'Zamanı kesmek için!' 🗡️`
    ];
    aciklama = espriler[Math.floor(Math.random() * espriler.length)] + `\n\n*Kılıç gibi soğuk bir espriydi, gölgelerde üşümeyesin samuray!*`;
  }

  // =========================================================================
  // 22. RAKİP BOTLAR (MEE6 VB.)
  // =========================================================================
  else if (iceriyorMu(metin, RAKIP_BOTLAR)) {
    baslik = '🗑️ ÇÖP BOTLARA GEÇİT YOK';
    renk = TEMA.RENKLER.UYARI_SARI;
    aciklama = `MEE6 veya yabancı tüccar botları mı? Onları Kage Kalesi'nin kapısından içeri bile sokmuyoruz!\n\n` +
      `Biz yerli, katanalı, manga odaklı, RPG zindanlı ve yapay zeka destekli tek başımıza koca bir orduyuz!`;
  }

  // =========================================================================
  // 23. KÜFÜR & HAKARET AYARI
  // =========================================================================
  else if (iceriyorMu(metin, KUFUR_HAKARET)) {
    baslik = '🥋 TERBİYE VE ONUR DERSİ';
    renk = TEMA.RENKLER.UYARI_SARI;
    aciklama = `Sakin ol **${userName}**! Bir samurayın dili, kılıcından önce terbiye edilmelidir.\n\n` +
      `Kaba sözler katananı köreltir, ruhunu lekeleme. Saygını koru ve kılıcını kınına sok.`;
  }

  // =========================================================================
  // 24. PİNG & HIZ
  // =========================================================================
  else if (iceriyorMu(metin, PING_HIZ)) {
    baslik = '⚡ ŞİMŞEK HIZI';
    renk = TEMA.RENKLER.BASARI;
    aciklama = `Gölgelerden bile hızlıyım **${userName}**! Katananın havayı yarma hızı kadar seri çalışıyorum.`;
  }

  // =========================================================================
  // 25. ÖVGÜ
  // =========================================================================
  else if (iceriyorMu(metin, OVGU)) {
    baslik = '🥋 ONUR DUYDUM!';
    renk = TEMA.RENKLER.BASARI;
    aciklama = `Eyvallah **${userName}**, onur duydum kılıç kardeşim! Kage klanı her zaman arkanda. Katanan asla körelmesin!`;
  }

  // =========================================================================
  // 26. YARDIM & REHBER
  // =========================================================================
  else if (iceriyorMu(metin, YARDIM)) {
    baslik = '📜 KAGE YARDIM PARŞÖMENİ';
    renk = TEMA.RENKLER.BILGI;
    aciklama = `Tüm sistemlerimi, RPG komutlarımı, manga kütüphanesini ve moderasyon araçlarını görmek için **/yardim** yazman yeterli!`;
  }

  // =========================================================================
  // 27. HAL HATIR / NABER / NASILSIN
  // =========================================================================
  else if (iceriyorMu(metin, HAL_HATIR)) {
    aciklama = `🗡️ İyiyim çok şükür **${userName}**! Katanayı biledim, yeşil çayımı yudumluyorum, sen nasılsın?\n\n` +
      `**${guildName}** semalarında hava sakin, zindanlar ise kan ağlıyor! Kesende **${ryo} Ryo** ve elinde **${kilic.ad}** görüyorum.\n` +
      `Bugün zindana inip birkaç iblis kellesi uçurdun mu bakalım?`;
  }

  // =========================================================================
  // 28. KULLANICI İYİ DURUMDA
  // =========================================================================
  else if (iceriyorMu(metin, KULLANICI_IYI)) {
    aciklama = `🔥 Harika haber **${userName}**! Kılıcın gibi enerjin de pırıl pırıl parlıyor.\n\n` +
      `Bu yüksek moralle **/zindan**'a girsen iblislere tek atarsın! Ya da **/blackjack** masasına oturup krupiyeyi terletmeye ne dersin?`;
  }

  // =========================================================================
  // 29. KULLANICI KÖTÜ DURUMDA
  // =========================================================================
  else if (iceriyorMu(metin, KULLANICI_KOTU)) {
    aciklama = `🍵 Ah be samuray **${userName}**... Bazen en sert fırtınalar bile diler, geriye sadece kökleri sağlam ağaçlar kalır.\n\n` +
      `Kılıcını bir kenara bırak, derin bir nefes al ve **[kage95.com](${siteUrl})** kütüphanemizden kafa dağıtacak güzel bir manga oku.\n` +
      `Moralini bozma, Kage klanı her zaman seninle!`;
  }

  // =========================================================================
  // 30. SELAMLAR
  // =========================================================================
  else if (iceriyorMu(metin, SELAMLAR)) {
    aciklama = `⛩️ Selamlar samuray **${userName}**! **${guildName}** kalesine hoş geldin.\n\n` +
      `Kılıcın keskin, bahtın açık olsun. Zindan seferi, manga arama veya kumarcı köşesi için hazırım!`;
  }

  // =========================================================================
  // 31. KİMLİK / SEN KİMSİN
  // =========================================================================
  else if (iceriyorMu(metin, KIMLIK)) {
    aciklama = `🏮 Ben **Kage-95**!\n\n` +
      `**[kage95.com](${siteUrl})** manga platformunun resmi gölge bekçisi, samuray rehberi ve topluluk asistanıyım.\n` +
      `Sunucuda manga arar, zindan savaşlarını yönetir, kumar masalarını kurar ve klan üyelerini korurum!`;
  }

  // =========================================================================
  // 32. YALNIZCA "KAGE"
  // =========================================================================
  else if (!metin || metin === 'kage') {
    aciklama = `Selam **${userName}**! Buyur kılıç kardeşim, beni mi çağırdın?\n\n` +
      `Şu an **${guildName}** kalesinde ${memberCount} samurayla birlikte nöbetteyim. Kesende **${ryo} Ryo** bulunuyor.\n` +
      `Bana merak ettiğin bir şeyi sorabilir veya **/yardim** yazarak tüm komutlarımı görebilirsin!`;
  }

  // =========================================================================
  // 33. GENEL FALLBACK (CANLI PROFİL İPUCU + RASTGELE SAMURAY SÖZÜ)
  // =========================================================================
  else {
    const soz = SAMURAY_SOZLERI[Math.floor(Math.random() * SAMURAY_SOZLERI.length)];
    aciklama = `${soz}\n\n` +
      `*${userName}, elindeki **${kilic.ad}** ve cüzdanındaki **${ryo} Ryo** ile Kage Kalesi'nde yolunu bulabilirsin. Bana soru sorabilir veya \`/yardim\` yazabilirsin.*`;
  }

  return kageEmbed({
    baslik,
    renk,
    aciklama,
    footer: `Kage-95 Canlı İstihbarat & Chat Bot • ${guildName}`
  });
}
