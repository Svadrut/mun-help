const PASSWORD_KEY = "app-password";
export const PASSWORD_NEEDED = "password-needed";

export function getPassword() {
  try {
    return localStorage.getItem(PASSWORD_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setPassword(value: string) {
  try {
    localStorage.setItem(PASSWORD_KEY, value);
  } catch {}
}

export async function postForm<T>(url: string, form: FormData): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    body: form,
    headers: { "x-app-password": getPassword() },
  });
  if (res.ok) return res.json();
  if (res.status === 401) window.dispatchEvent(new Event(PASSWORD_NEEDED));
  if (res.status === 413) {
    throw new Error("File is over the 4.5 MB upload limit on Vercel. Compress it or run the app locally.");
  }
  const body = await res.json().catch(() => null);
  throw new Error(body?.error ?? `Request failed (${res.status})`);
}
