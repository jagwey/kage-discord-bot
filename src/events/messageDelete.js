import { Events } from 'discord.js';
import { TEMA } from '../config/tema.js';
import { modLogGonder } from '../services/modLogServisi.js';

export const name = Events.MessageDelete;

/**
 * Bir mesaj silindiğinde tetiklenir ve denetim kaydına gönderir
 * @param {import('discord.js').Message} message
 */
export async function execute(message) {
  // Bot mesajlarını ve sistem mesajlarını yoksay
  if (!message.guild || message.author?.bot) return;

  const icerik = message.content
    ? (message.content.length > 900 ? message.content.slice(0, 897) + '...' : message.content)
    : '*(Metin içeriği yok veya sadece ek/görsel içeriyordu)*';

  await modLogGonder(message.guild, {
    baslik: '🗑️ BİR MESAJ SİLİNDİ',
    renk: TEMA.RENKLER.BILGI,
    aciklama: `Bir mesaj ${message.channel} kanalından silindi.`,
    hedefAvatar: message.author?.displayAvatarURL(),
    alanlar: [
      { name: 'Mesaj Sahibi', value: message.author ? `${message.author} (\`${message.author.tag}\`)` : 'Bilinmiyor', inline: true },
      { name: 'Kanal', value: `${message.channel}`, inline: true },
      { name: 'Silinen İçerik', value: `\`\`\`\n${icerik}\n\`\`\``, inline: false }
    ]
  });
}
