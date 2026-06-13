export const authPageStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');

  @property --ap-angle {
    syntax: '<angle>';
    initial-value: 0deg;
    inherits: false;
  }

  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }

  /* ── Page shell ── */
  .ap {
    display: flex;
    width: 100%;
    height: 100vh;
    max-height: 100vh;
    overflow: hidden;
    background: #000;
    font-family: var(--font-sans);
  }

  /* ── LEFT 45% — pure black, scrollable ── */
  .ap-left {
    flex: 0 0 45%;
    width: 45%;
    min-width: 0;
    min-height: 0;
    background: #000;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .ap-logo-bar {
    flex-shrink: 0;
    padding: 36px 52px 0;
  }

  .ap-form-body {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 52px 52px;
  }

  .ap-form-inner { width: 100%; max-width: 400px; }

  @keyframes ap-border-spin {
    to { --ap-angle: 360deg; }
  }

  .ap-card {
    background: transparent;
    border: 1.5px solid transparent;
    border-radius: 16px;
    padding: 40px 40px 36px;
    position: relative;
    background-image:
      linear-gradient(#000, #000),
      conic-gradient(
        from var(--ap-angle),
        transparent 0%,
        rgba(255, 255, 255, 0.0) 60%,
        rgba(255, 255, 255, 0.65) 75%,
        rgba(255, 255, 255, 0.0) 90%,
        transparent 100%
      );
    background-origin: border-box;
    background-clip: padding-box, border-box;
    animation: ap-border-spin 5s linear infinite;
  }

  /* ── RIGHT 55% — image panel ── */
  .ap-right {
    flex: 0 0 55%;
    width: 55%;
    min-width: 0;
    min-height: 0;
    position: relative;
    overflow: hidden;
    background: #000;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /*
    Portrait image in landscape slot → contain so the full
    AI figure is always visible. Black background blends
    seamlessly with the page since the image bg is also black.
  */
  .ap-right img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: center center;
    display: block;
  }

  /* Subtle left-edge blend into form panel */
  .ap-right::before {
    content: '';
    position: absolute;
    top: 0; left: 0;
    width: 80px;
    height: 100%;
    background: linear-gradient(to right, #000, transparent);
    pointer-events: none;
    z-index: 1;
  }

  /* ── Inputs ── */
  .ap input:-webkit-autofill,
  .ap input:-webkit-autofill:hover,
  .ap input:-webkit-autofill:focus {
    -webkit-text-fill-color: #fff !important;
    -webkit-box-shadow: 0 0 0 1000px #000 inset !important;
    transition: background-color 5000s ease-in-out 0s;
  }
  .ap input::placeholder { color: rgba(255,255,255,0.25); }

  /* ── Submit button ── */
  .ap-submit {
    position: relative;
    overflow: hidden;
    width: 100%;
    padding: 14px 20px;
    background: linear-gradient(135deg, #FF7A1A 0%, #bf5c14 100%);
    border: none;
    border-radius: 10px;
    color: #fff;
    font-size: 15px;
    font-family: var(--font-heading);
    font-weight: 700;
    cursor: pointer;
    letter-spacing: 0.01em;
    box-shadow: 0 4px 20px rgba(255,122,26,0.28);
    transition: transform 0.15s, box-shadow 0.15s;
    margin-top: 8px;
  }
  .ap-submit::before {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
    transform: translateX(-100%);
    transition: transform 0.45s;
  }
  .ap-submit:hover:not(:disabled)::before { transform: translateX(100%); }
  .ap-submit:hover:not(:disabled) {
    box-shadow: 0 6px 28px rgba(255,122,26,0.45);
    transform: translateY(-1px);
  }
  .ap-submit:active:not(:disabled) { transform: translateY(0); }
  .ap-submit:disabled { opacity: 0.4; cursor: not-allowed; }

  .ap-switch:hover { color: #FF9B4A !important; text-decoration: underline; }

  /* ── Responsive ── */

  @media (max-width: 1100px) {
    .ap-left  { flex: 0 0 50%; width: 50%; }
    .ap-right { flex: 0 0 50%; width: 50%; }
    .ap-logo-bar  { padding: 28px 40px 0; }
    .ap-form-body { padding: 36px 40px 48px; }
    .ap-card { padding: 36px 32px; }
    .ap-right img { object-position: 35% center; }
  }

  /* tablet: stack vertically, image goes below */
  @media (max-width: 768px) {
    .ap {
      flex-direction: column;
      height: auto;
      max-height: none;
      min-height: 100vh;
      overflow-x: hidden;
      overflow-y: auto;
    }
    .ap-left {
      flex: none;
      width: 100%;
      height: auto;
      overflow-y: visible;
    }
    .ap-right {
      flex: none;
      width: 100%;
      height: 340px;
      min-height: 340px;
    }
    /* on mobile contain still works — figure stays visible */
    .ap-right img { object-fit: contain; object-position: center top; }
    .ap-right::before { display: none; }
    .ap-logo-bar  { padding: 24px 24px 0; }
    .ap-form-body { padding: 28px 20px 40px; }
    .ap-card { padding: 28px 24px 24px; }
    .ap-form-inner { max-width: 100%; }
  }

  @media (max-width: 480px) {
    .ap-right { height: 260px; min-height: 260px; }
    .ap-logo-bar  { padding: 20px 16px 0; }
    .ap-form-body { padding: 24px 16px 36px; }
    .ap-card { padding: 24px 18px 20px; border-radius: 12px; }
  }
`;
