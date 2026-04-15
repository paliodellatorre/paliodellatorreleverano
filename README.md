<%- include('partials/header') %>
<div class="login-box card">
  <h1 style="margin-top:0;color:var(--green);">Accesso Admin</h1>
  <p class="small">Accedi al pannello amministratore del Palio della Torre.</p>
  <form method="post" action="/admin/login">
    <div style="margin-bottom:14px;">
      <label>Username</label>
      <input name="username" required />
    </div>
    <div style="margin-bottom:16px;">
      <label>Password</label>
      <input type="password" name="password" required />
    </div>
    <button class="button button-yellow" type="submit">Entra</button>
  </form>
</div>
<%- include('partials/footer') %>
