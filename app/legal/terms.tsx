/**
 * legal/terms.tsx — Kullanım Koşulları (Phase 2 — Faz 2)
 * Kayıt akışı + Ayarlar menüsünden erişilebilir.
 */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SECTIONS = [
  {
    title: '1. Taraflar ve Tanımlar',
    body: 'Bu sözleşme, Spotlights işletmecisi ile Platformu ziyaret eden, kayıt olan veya içerik üreten "Kullanıcı" arasında akdedilmiştir.\n\nİçerik: Kullanıcılar tarafından yüklenen metin, görsel, video, ses ve diğer materyalleri ifade eder.\n\nSpotlight: Platform üzerindeki öne çıkan veya paylaşılan her türlü dijital varlığı temsil eder.',
  },
  {
    title: '2. Hizmetin Kapsamı ve Değişiklikler',
    body: 'Spotlights, kullanıcılarına dijital içerik paylaşma, etkileşim kurma ve keşfetme imkanı sunan bir sosyal etkileşim platformudur. Platform, teknolojik gelişmelere veya yasal gerekliliklere bağlı olarak özelliklerini önceden haber vermeksizin değiştirme, askıya alma veya sonlandırma hakkını saklı tutar.',
  },
  {
    title: '3. Kayıt ve Hesap Güvenliği',
    body: 'Yaş Sınırı: Platformu kullanmak için en az 13 yaşında olmanız gerekmektedir.\n\nDoğruluk: Kayıt sırasında verilen bilgiler güncel ve doğru olmalıdır.\n\nGizlilik: Şifrenizin güvenliğinden bizzat sorumlusunuz. Hesabınız üzerinden yapılan tüm işlemler sizin sorumluluğunuzdadır.',
  },
  {
    title: '4. Kullanım Kuralları',
    body: 'Aşağıdaki eylemler kesinlikle yasaktır:\n\n• Yerel ve uluslararası yasalara aykırı içerik paylaşmak\n• Diğer kullanıcıları tehdit etmek, aşağılamak\n• Otomatik sistemler aracılığıyla veri çekmek (scraping)\n• Kendinize ait olmayan içerikleri paylaşmak (telif hakkı ihlali)',
  },
  {
    title: '5. Fikri Mülkiyet Hakları',
    body: '5.1. Sizin İçeriğiniz\nSpotlights\'a yüklediğiniz içeriklerin mülkiyeti size aittir. Ancak içerik yükleyerek, Platforma bu içeriği barındırma, sergileme, çoğaltma ve dağıtma hakkını veren dünya çapında, telifsiz ve devredilebilir bir lisans tanımış olursunuz.\n\n5.2. Spotlights İçeriği\nPlatformun tasarımı, logoları, yazılım kodları ve markası Spotlights\'a aittir. İzinsiz kopyalanamaz veya kullanılamaz.',
  },
  {
    title: '6. Sorumluluk Reddi',
    body: 'Spotlights, "olduğu gibi" esasıyla hizmet sunar. Platform, kullanıcılar tarafından paylaşılan içeriklerin doğruluğunu, güvenilirliğini veya yasalara uygunluğunu garanti etmez.\n\nPlatform kullanımından kaynaklanabilecek veri kaybı, kâr kaybı veya donanımsal zararlardan Spotlights yönetimi sorumlu tutulamaz.',
  },
  {
    title: '7. Hesap Kapatma',
    body: 'Kullanıcılar istedikleri zaman hesaplarını silebilirler. Spotlights, Kullanım Koşulları\'nı ihlal eden kullanıcıların hesaplarını önceden bildirimde bulunmaksızın askıya alma veya tamamen silme hakkını saklı tutar.',
  },
  {
    title: '8. Gizlilik Politikası',
    body: 'Platformu kullanımınız sırasında toplanan veriler, Gizlilik Politikası metnimize tabidir.',
  },
  {
    title: '9. Uyuşmazlıkların Çözümü',
    body: 'Bu sözleşmeden kaynaklanan uyuşmazlıklarda, Platformun merkezinin bulunduğu yer mahkemeleri ve icra daireleri yetkilidir.',
  },
  {
    title: '10. İletişim',
    body: 'Bu koşullar hakkında sorularınız için: burkitas.2730@gmail.com',
  },
];

export default function TermsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kullanım Koşulları</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.updateDate}>Son Güncelleme: 27 Mart 2026</Text>
        <Text style={styles.intro}>
          Spotlights platformunu kullanmadan önce bu Kullanıcı Koşulları metnini dikkatlice okuyunuz.
          Platforma erişerek, bu koşullara bağlı kalmayı kabul etmiş sayılırsınız.
        </Text>

        {SECTIONS.map((section, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0505' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 17, fontFamily: 'Poppins_600SemiBold' },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  updateDate: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 12, fontFamily: 'Poppins_400Regular' },
  intro: { color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 22, marginBottom: 24, fontFamily: 'Poppins_400Regular' },
  section: { marginBottom: 24 },
  sectionTitle: { color: '#fff', fontSize: 15, fontFamily: 'Poppins_600SemiBold', marginBottom: 8 },
  sectionBody: { color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 21, fontFamily: 'Poppins_400Regular' },
});
