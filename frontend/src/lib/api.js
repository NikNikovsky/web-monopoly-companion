export async function fetchJSON(url, opts){
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(r.statusText);
  return r.json();
}

export async function postJSON(url, body){
  return fetchJSON(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}
