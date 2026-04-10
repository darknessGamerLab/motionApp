/**
 * legal/privacy.tsx — Gizlilik Politikası (Phase 2 — Faz 2)
 */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SECTIONS = [
  {
    title: '1. Topladığımız Veriler',
    body: '• Hesap Bilgileri: Ad, soyad, e-posta, kullanıcı adı\n• Profil Bilgileri: Biyografi, yetenek setleri, profil fotoğrafı\n• İçerik Verileri: Paylaştığınız videolar, etkileşimler, yorumlar\n• Teknik Veriler: IP adresi, cihaz modeli, işletim sistemi\n• Konum Verileri: Radar özelliği için (izninize bağlı)',
  },
  {
    title: '2. Verilerin Kullanım Amaçları',
    body: '• Platform işlevselliği: Profil oluşturma, yetenek keşfi\n• Radar Özelliği: Yakınızdaki yetenek avcılarını eşleştirme\n• Geliştirme: Uygulama performansını analiz etme\n• Güvenlik: Şüpheli etkinlikleri tespit etme\n• İletişim: Teknik uyarılar ve destek',
  },
  {
    title: '3. Verilerin Paylaşımı',
    body: 'Spotlights verilerinizi üçüncü taraflara satmaz. Paylaşım yalnızca şu durumlarda yapılır:\n\n• Yetenek avcıları ve kulüpler: Kamuya açık profil ve içerikleriniz\n• Yasal zorunluluklar: Yetkili kamu kurumları talebiyle\n• Hizmet sağlayıcılar: Veri depolama ve analiz iş ortakları (gizlilik sözleşmesi çerçevesinde)',
  },
  {
    title: '4. Veri Güvenliği',
    body: 'Verilerinizi korumak için SSL/TLS şifreleme ve güvenli sunucu altyapısı kullanıyoruz. Ancak internet üzerinden hiçbir iletişim %100 güvenli değildir.',
  },
  {
    title: '5. Kullanıcı Hakları (KVKK/GDPR)',
    body: '• İşlenen verilerinizi öğrenme\n• Yanlış verilerin düzeltilmesini isteme\n• Hesabınızın ve tüm verilerinizin silinmesini talep etme\n• Veri işleme faaliyetlerine itiraz etme',
  },
  {
    title: '6. Mobil Uygulama & Takip Teknolojileri',
    body: 'Uygulama deneyiminizi iyileştirmek amacıyla anonim kullanım analitikleri topluyoruz. Bu veriler kişisel kimliğinizle eşlenmez. Mobil uygulamalar web tarayıcılarındaki çerez sistemini kullanmaz; bunun yerine yerel depolama (AsyncStorage) kullanılmaktadır.',
  },
  {
    title: '7. Çocukların Gizliliği (COPPA / KVKK)',
    body: 'Uygulamamız yetenek sergileme amaçlı olup özellikle 7-18 yaş kitlesini hedeflemektedir. COPPA ve KVKK uyarınca, 7-13 yaş arası kullanıcıların uygulamaya kayıt olurken işlemlerini bir ebeveyn veya yasal veli gözetiminde gerçekleştirdikleri ve kişisel verilerinin işlenmesine yönelik gerekli explicit (açık) ebeveyn rızasına sahip oldukları kabul edilir. Ebeveynler, çocuklarının verilerinin incelenmesini veya silinmesini talep etmek için iletişim kanallarımızdan bize ulaşabilir; bu durumda ilgili veriler derhal imha edilir.',
  },
  {
    title: '8. Değişiklikler',
    body: 'Bu politika güncellenebilir. Önemli değişiklikler uygulama içinden veya e-posta ile bildirilecektir.',
  },
  {
    title: '9. İletişim',
    body: 'Gizlilikle ilgili sorularınız için:\n\nE-posta: burkitas.2730@gmail.com\nAdres: Trabzon, Türkiye',
  },
];

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gizlilik Politikası</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.updateDate}>Yürürlük Tarihi: 27 Mart 2026</Text>
        <Text style={styles.intro}>
          Spotlights olarak kişisel verilerinizin güvenliği ve gizliliği bizim için en yüksek önceliktir.
        </Text>

        {SECTIONS.map((s, i) => (
          <View key={i} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.1)',
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
