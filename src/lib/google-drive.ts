async function getAccessToken(): Promise<string> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing Google OAuth credentials. Set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REFRESH_TOKEN in .env.local"
    );
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) throw new Error(`Failed to get access token: ${await res.text()}`);
  const data = await res.json();
  return data.access_token as string;
}

async function driveRequest(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  return fetch(`https://www.googleapis.com/drive/v3${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

export async function createGoogleDoc(name: string): Promise<{
  fileId: string;
  fileUrl: string;
}> {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) throw new Error("GOOGLE_DRIVE_FOLDER_ID is not set in .env.local");

  const createRes = await driveRequest("/files?fields=id,webViewLink", {
    method: "POST",
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.document",
      parents: [folderId],
    }),
  });

  if (!createRes.ok) throw new Error(`Failed to create doc: ${await createRes.text()}`);
  const file = await createRes.json();
  const fileId: string = file.id;

  const metaRes = await driveRequest(`/files/${fileId}?fields=webViewLink`);
  const meta = await metaRes.json();

  return {
    fileId,
    fileUrl: meta.webViewLink ?? `https://docs.google.com/document/d/${fileId}/edit`,
  };
}

export async function renameGoogleDoc(fileId: string, name: string): Promise<void> {
  await driveRequest(`/files/${fileId}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export async function deleteGoogleDoc(fileId: string): Promise<void> {
  await driveRequest(`/files/${fileId}`, { method: "DELETE" }).catch(() => {});
}
