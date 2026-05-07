<template>
  <div class="app-container">
    <nav class="nav-bar">
      <div class="nav-content">
        <div class="logo">
          <span class="logo-icon">⏱</span>
          <span class="logo-text">迹录</span>
        </div>
        <div class="nav-links">
          <router-link to="/" class="nav-link" active-class="active">
            <span class="nav-icon">▶</span>
            计时
          </router-link>
          <router-link to="/records" class="nav-link" active-class="active">
            <span class="nav-icon">📋</span>
            记录
          </router-link>
          <router-link to="/stats" class="nav-link" active-class="active">
            <span class="nav-icon">📊</span>
            统计
          </router-link>
          <router-link to="/settings" class="nav-link" active-class="active">
            <span class="nav-icon">⚙</span>
            设置
          </router-link>
        </div>
      </div>
    </nav>
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup></script>

<style scoped>
.app-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-color);
}

.nav-bar {
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 20px;
  font-weight: 600;
  color: var(--primary-color);
}

.logo-icon {
  font-size: 24px;
}

.nav-links {
  display: flex;
  gap: 8px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  text-decoration: none;
  color: var(--text-light);
  font-size: 15px;
  transition: all 0.3s ease;
}

.nav-link:hover {
  background: var(--bg-color);
  color: var(--primary-color);
}

.nav-link.active {
  background: linear-gradient(
    135deg,
    var(--primary-color),
    var(--primary-light)
  );
  color: white;
}

.nav-icon {
  font-size: 16px;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 0;
}
</style>
