// Yavaş ağ isteği sonraki zamanlayıcı turuyla üst üste binmesin.
export function tekGorev(islem, hata = console.error) {
  let calisiyor = false;
  return async (...args) => {
    if (calisiyor) return;
    calisiyor = true;
    try { return await islem(...args); }
    catch (err) { hata(err); }
    finally { calisiyor = false; }
  };
}
