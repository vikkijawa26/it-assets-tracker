# Artifact Explorer

Content is user-generated and unverified.


Learn about artifacts
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Asset Ledger</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jsqr/1.4.0/jsQR.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
<style>
  @font-face {
    font-family: 'system-mono';
    src: local('IBM Plex Mono');
  }
  :root{
    --bg: #12151A;
    --surface: #1A1F27;
    --surface-raised: #222933;
    --border: #2C333D;
    --text: #E7EAEE;
    --text-dim: #8890A0;
    --accent: #5EEAD4;
    --accent-dim: #1F3D39;
    --danger: #F87171;
    --st-active: #34D399;
    --st-repair: #FBBF24;
    --st-storage: #60A5FA;
    --st-retired: #94A3B8;
    --font-ui: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    --font-mono: 'IBM Plex Mono', 'SF Mono', Consolas, monospace;
  }
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

  *{ box-sizing: border-box; margin:0; padding:0; }
  html,body{ height:100%; }
  body{
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-ui);
    font-size: 15px;
    line-height: 1.45;
    -webkit-tap-highlight-color: transparent;
  }
  #app{
    display:flex;
    flex-direction:column;
    height:100vh;
    max-width: 520px;
    margin: 0 auto;
    position: relative;
    overflow:hidden;
  }

  /* header */
  header{
    display:flex;
    align-items:center;
    justify-content:space-between;
    padding: 16px 18px 14px;
    border-bottom: 1px solid var(--border);
    flex-shrink:0;
  }
  .brand{ display:flex; align-items:center; gap:10px; }
  .brand-mark{
    width:30px; height:30px; border-radius:7px;
    background: var(--accent-dim);
    display:flex; align-items:center; justify-content:center;
    color: var(--accent);
  }
  .brand-name{ font-weight:600; font-size:16.5px; letter-spacing:-0.01em; }
  .count-pill{
    font-family: var(--font-mono);
    font-size: 12.5px;
    color: var(--text-dim);
    background: var(--surface);
    border: 1px solid var(--border);
    padding: 5px 10px;
    border-radius: 20px;
  }

  /* main scroll area */
  main{
    flex:1;
    overflow-y:auto;
    padding: 18px 18px 90px;
    -webkit-overflow-scrolling: touch;
  }

  /* bottom nav */
  nav.tabbar{
    position:absolute;
    bottom:0; left:0; right:0;
    display:flex;
    background: var(--surface);
    border-top: 1px solid var(--border);
    padding: 8px 10px calc(8px + env(safe-area-inset-bottom));
    flex-shrink:0;
  }
  nav.tabbar button{
    flex:1;
    display:flex;
    flex-direction:column;
    align-items:center;
    gap:4px;
    background:none;
    border:none;
    color: var(--text-dim);
    font-family: var(--font-ui);
    font-size: 11.5px;
    padding: 6px 0 4px;
    border-radius: 10px;
    cursor:pointer;
  }
  nav.tabbar button.active{ color: var(--accent); }
  nav.tabbar svg{ width:22px; height:22px; }

  /* scan tab */
  .scan-stage{
    border-radius: 16px;
    overflow:hidden;
    position:relative;
    background: #05070A;
    aspect-ratio: 3/4;
    border: 1px solid var(--border);
  }
  .scan-stage video{
    width:100%; height:100%; object-fit:cover;
    display:none;
  }
  .scan-stage.live video{ display:block; }
  .scan-frame{
    position:absolute; inset: 14%;
    border: 2px solid var(--accent);
    border-radius: 14px;
    opacity: 0.85;
    pointer-events:none;
  }
  .scan-frame::before, .scan-frame::after{ content:''; }
  .scan-idle{
    position:absolute; inset:0;
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    gap:14px; padding: 30px; text-align:center;
  }
  .scan-idle svg{ width:46px; height:46px; color: var(--text-dim); }
  .scan-idle p{ color: var(--text-dim); font-size:13.5px; max-width:220px; }
  .scan-status{
    margin-top:14px;
    text-align:center;
    color: var(--text-dim);
    font-size: 13.5px;
    min-height: 20px;
  }
  .scan-status.found{ color: var(--accent); font-weight:600; }

  .btn{
    display:flex; align-items:center; justify-content:center;
    gap:8px;
    width:100%;
    padding: 13px 16px;
    border-radius: 11px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    font-family: var(--font-ui);
    font-size: 14.5px;
    font-weight:500;
    cursor:pointer;
  }
  .btn-primary{
    background: var(--accent);
    border-color: var(--accent);
    color: #06201C;
    font-weight:600;
  }
  .btn-ghost{
    background:transparent;
    border-color: transparent;
    color: var(--text-dim);
  }
  .btn-row{ display:flex; gap:10px; margin-top:12px; }
  .btn-row .btn{ flex:1; }

  h2.section-title{
    font-size: 13px;
    color: var(--text-dim);
    font-weight:500;
    margin: 22px 0 10px;
  }
  h2.section-title:first-child{ margin-top:0; }

  /* search */
  .search-bar{
    display:flex; align-items:center; gap:8px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 11px;
    padding: 10px 14px;
    margin-bottom: 14px;
  }
  .search-bar svg{ width:16px; height:16px; color: var(--text-dim); flex-shrink:0; }
  .search-bar input{
    background:none; border:none; outline:none;
    color: var(--text); font-family: var(--font-ui); font-size:14px;
    width:100%;
  }
  .filter-row{ display:flex; gap:6px; margin-bottom:16px; overflow-x:auto; padding-bottom:2px; }
  .chip{
    font-size:12.5px; padding:6px 12px; border-radius:20px;
    border:1px solid var(--border); color: var(--text-dim);
    background: var(--surface); white-space:nowrap; cursor:pointer;
    flex-shrink:0;
  }
  .chip.active{ background: var(--accent-dim); color: var(--accent); border-color: var(--accent-dim); }

  /* asset card */
  .asset-card{
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 13px;
    padding: 14px 15px;
    margin-bottom: 10px;
    cursor:pointer;
  }
  .asset-top{ display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px; }
  .asset-tag{ font-family: var(--font-mono); font-size:13px; color: var(--text-dim); }
  .status-badge{
    display:inline-flex; align-items:center; gap:5px;
    font-size:12px; font-weight:500; padding:3px 9px; border-radius:20px;
  }
  .status-badge .dot{ width:6px; height:6px; border-radius:50%; }
  .st-active{ color: var(--st-active); background: rgba(52,211,153,0.12); }
  .st-active .dot{ background: var(--st-active); }
  .st-repair{ color: var(--st-repair); background: rgba(251,191,36,0.12); }
  .st-repair .dot{ background: var(--st-repair); }
  .st-storage{ color: var(--st-storage); background: rgba(96,165,250,0.12); }
  .st-storage .dot{ background: var(--st-storage); }
  .st-retired{ color: var(--st-retired); background: rgba(148,163,184,0.12); }
  .st-retired .dot{ background: var(--st-retired); }

  .asset-name{ font-size:15px; font-weight:600; margin-bottom:3px; }
  .asset-meta{ font-size:13px; color: var(--text-dim); }

  .empty-state{
    text-align:center; padding: 50px 20px; color: var(--text-dim);
  }
  .empty-state svg{ width:38px; height:38px; margin-bottom:14px; opacity:0.6; }
  .empty-state p{ font-size:13.5px; }

  /* form / sheet */
  .sheet-backdrop{
    position:absolute; inset:0; background: rgba(0,0,0,0.55);
    display:none; z-index:20;
  }
  .sheet-backdrop.open{ display:block; }
  .sheet{
    position:absolute; left:0; right:0; bottom:0;
    background: var(--surface-raised);
    border-radius: 20px 20px 0 0;
    border: 1px solid var(--border);
    border-bottom:none;
    padding: 10px 20px calc(22px + env(safe-area-inset-bottom));
    transform: translateY(100%);
    transition: transform 0.25s ease;
    max-height: 88vh;
    overflow-y:auto;
    z-index:21;
  }
  .sheet.open{ transform: translateY(0); }
  .sheet-handle{
    width:36px; height:4px; background: var(--border); border-radius:3px;
    margin: 8px auto 16px;
  }
  .sheet-tag{ font-family: var(--font-mono); font-size:20px; font-weight:600; color: var(--accent); margin-bottom:2px; }
  .sheet-sub{ font-size:12.5px; color: var(--text-dim); margin-bottom: 20px; }

  .field{ margin-bottom: 14px; }
  .field label{ display:block; font-size:12.5px; color: var(--text-dim); margin-bottom:6px; }
  .field input, .field select, .field textarea{
    width:100%;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 11px 13px;
    color: var(--text);
    font-family: var(--font-ui);
    font-size: 14.5px;
    outline:none;
  }
  .field input:focus, .field select:focus, .field textarea:focus{ border-color: var(--accent); }
  .field textarea{ resize:none; min-height:60px; }

  .status-options{ display:flex; gap:8px; flex-wrap:wrap; }
  .status-opt{
    flex:1; min-width: 44%;
    text-align:center;
    padding: 10px 8px;
    border-radius: 10px;
    border: 1px solid var(--border);
    font-size:13.5px;
    cursor:pointer;
    color: var(--text-dim);
  }
  .status-opt.selected.st-active{ border-color: var(--st-active); color: var(--st-active); background: rgba(52,211,153,0.1); }
  .status-opt.selected.st-repair{ border-color: var(--st-repair); color: var(--st-repair); background: rgba(251,191,36,0.1); }
  .status-opt.selected.st-storage{ border-color: var(--st-storage); color: var(--st-storage); background: rgba(96,165,250,0.1); }
  .status-opt.selected.st-retired{ border-color: var(--st-retired); color: var(--st-retired); background: rgba(148,163,184,0.1); }

  /* export tab */
  .stat-grid{ display:flex; gap:10px; margin-bottom: 22px; flex-wrap:wrap; }
  .stat-card{
    flex:1; min-width: 100px;
    background: var(--surface);
    border:1px solid var(--border);
    border-radius: 13px;
    padding: 14px;
  }
  .stat-num{ font-family: var(--font-mono); font-size:24px; font-weight:600; }
  .stat-label{ font-size:12px; color: var(--text-dim); margin-top:2px; }

  .toast{
    position:absolute; left:50%; bottom:100px; transform: translateX(-50%) translateY(20px);
    background: var(--surface-raised); border:1px solid var(--border);
    color: var(--text); padding: 11px 18px; border-radius: 30px;
    font-size:13.5px; opacity:0; transition: all 0.25s ease; z-index:30;
    pointer-events:none; white-space:nowrap;
  }
  .toast.show{ opacity:1; transform: translateX(-50%) translateY(0); }






    


      


        
      


      

Asset Ledger


    


    

0 assets



  

  



  
    
      
      Scan
    
    
      
      Inventory
    
    
      
      Export

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://it-assets-tracker.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cb0e9fa1-8cf2-4997-ad0a-1a1590a276da).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
