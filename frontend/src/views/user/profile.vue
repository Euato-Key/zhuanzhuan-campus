<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'
import { useUserStore } from '@/stores/user'
import { useAuthDialog } from '@/composables/useAuthDialog'
import ProfileCard from './profile/ProfileCard.vue'
import ProfileBasicSection from './profile/ProfileBasicSection.vue'
import ProfilePasswordSection from './profile/ProfilePasswordSection.vue'
import ProfileEmailSection from './profile/ProfileEmailSection.vue'

const router = useRouter()
const userStore = useUserStore()
const authDialog = useAuthDialog()

onMounted(() => {
  if (!userStore.isLoggedIn) {
    authDialog.open('login')
    router.push('/')
  }
})
</script>

<template>
  <AppLayout>
    <div class="profile-page">
      <ProfileCard />

      <div class="settings-sections">
        <ProfileBasicSection />
        <ProfilePasswordSection />
        <ProfileEmailSection />
      </div>
    </div>
  </AppLayout>
</template>

<style scoped lang="scss">
@import '@/assets/styles/variables';

.profile-page {
  max-width: 800px;
  margin: 0 auto;
}

.settings-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
</style>