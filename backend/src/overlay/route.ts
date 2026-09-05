import { Router, type Request, type Response } from "express";
import { env } from "../config/env.js";
import { requireOverlayToken } from "../middleware/index.js";

/**
 * Rotas do overlay OBS.
 *
 * - GET /overlay/preview         -> página de pré-visualização (token opcional p/ demo)
 * - GET /overlay                  -> página do overlay (HTML transparente) — PROTEGIDA por token
 * - GET /overlay/ws               -> WebSocket de chat para o overlay (token exigido, montado no index.ts)
 *
 * O overlay é SEPARADO do painel administrativo e NUNCA expõe credenciais,
 * configurações privadas ou o estado interno além do necessário para renderizar.
 * O token é revogável mudando OVERLAY_TOKEN no ambiente.
 */
export function overlayRouter(): Router {
  const r = Router();

  // Pré-visualização (pode usar token demo para facilitar desenvolvimento)
  r.get("/preview", (req: Request, res: Response) => {
    const token = (req.query.token as string | undefined) ?? env.OVERLAY_TOKEN;
    res.type("html").send(renderOverlayPage(String(token), true));
  });

  // Overlay real — exige token
  r.get("/", requireOverlayToken, (req: Request, res: Response) => {
    const token = String(req.query.token);
    res.type("html").send(renderOverlayPage(token, false));
  });

  return r;
}

function renderOverlayPage(token: string, preview: boolean): string {
  const title = preview ? "Overlay Preview — Melvianna" : "Overlay OBS — Melvianna";
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
  html,body{margin:0;background:transparent;font-family:system-ui,Segoe UI,Roboto,sans-serif;color:#fff}
  #chat{position:fixed;inset:0;overflow:hidden;display:flex;flex-direction:column-reverse;gap:6px;padding:14px;box-sizing:border-box}
  .msg{opacity:0;transform:translateY(8px);animation:in .25s ease forwards}
  .msg.out{animation:out .35s ease forwards}
  @keyframes in{to{opacity:1;transform:none}}
  @keyframes out{to{opacity:0;transform:translateY(-8px)}}
  .p{display:inline-block;min-width:18px;padding:1px 6px;border-radius:6px;font-size:11px;margin-right:6px;font-weight:700}
  .twitch{background:#9146ff}.youtube{background:#ff0033}.kick{background:#53fc18;color:#000}
  .name{font-weight:700;color:#ffe082}
  .ev{font-style:italic;color:#90caf9}
  ${preview ? ".preview-badge{position:fixed;top:8px;right:10px;background:#ff9800;color:#000;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700}" : ""}
</style>
</head>
<body>
${preview ? '<div class="preview-badge">PRÉ-VISUALIZAÇÃO</div>' : ""}
<div id="chat"></div>
<script>
  const token = ${JSON.stringify(token)};
  const ws = new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/overlay/ws?token='+encodeURIComponent(token));
  const chat = document.getElementById('chat');
  const MAX = 20;
  ws.onmessage = (e) => {
    const data = JSON.parse(e.data);
    if (data.type !== 'message') return;
    const m = data.payload;
    const el = document.createElement('div');
    el.className = 'msg';
    const p = document.createElement('span');
    p.className = 'p '+m.platform; p.textContent = m.platform;
    const name = document.createElement('span'); name.className='name'; name.textContent = m.displayName+': ';
    const body = document.createElement('span');
    body.textContent = (m.eventType && m.eventType!=='message') ? '★ '+m.message : m.message;
    if (m.eventType && m.eventType!=='message') body.className='ev';
    el.appendChild(p); el.appendChild(name); el.appendChild(body);
    chat.appendChild(el);
    while (chat.children.length > MAX) chat.removeChild(chat.firstChild);
    setTimeout(()=>{ el.classList.add('out'); setTimeout(()=>el.remove(),350); }, 9000);
  };
  ws.onerror = () => { console.warn('overlay ws error'); };
</script>
</body>
</html>`;
}
