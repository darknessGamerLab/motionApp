/**
 * legal/kvkk.tsx — KVKK Aydınlatma Metni (Phase 2 — Faz 2)
 */
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SECTIONS = [
  {
    title: '1. İşlenen Kişisel Verileriniz',
    body: '• Kimlik Bilgileri: Ad, soyad, doğum tarihi\n• İletişim Bilgileri: E-posta adresi, telefon numarası\n• Görsel ve İşitsel Kayıtlar: Yetenek videoları, profil fotoğrafı\n• Mesleki Yetenek Verileri: Spor branşı, kulüp geçmişi, fiziksel özellikler\n• İşlem Güvenliği: IP adresi, giriş-çıkış kayıtları, cihaz ID\n• Lokasyon Verisi: Radar özelliği kapsamında (açık rızanız ile)',
  },
  {
    title: '2. Kişisel Verilerin İşlenme Amaçları',
    body: '• Kullanıcı hesabı oluşturulması ve kimlik doğrulaması\n• Scouting Faaliyetleri: Yetenekli bireylerin keşfedilmesi\n• Radar Sistemi: Yakın konumdaki kullanıcıların etkileşimi\n• Platform etkileşiminin yönetilmesi\n• Hukuki yükümlülüklerin yerine getirilmesi',
  },
  {
    title: '3. Kişisel Verilerin Aktarılması',
    body: '• Platform Kullanıcıları: Kamuya açık içerik ve profil bilgileriniz\n• Partner Kulüpler ve Kurumlar: Anlaşmalı spor okulları ve sanat akademileri\n• Yasal Merciler: Mevzuat gereği adli ve idari makamlar\n• Hizmet Sağlayıcılar: Veri tabanı ve bulut altyapı iş ortakları',
  },
  {
    title: '4. Veri Toplama Yöntemi ve Hukuki Sebep',
    body: 'Verileriniz mobil uygulama üzerinden tamamen dijital yollarla toplanmaktadır:\n\n• Sözleşmenin Kurulması ve İfası: Üyelik sözleşmesi gereklilikleri\n• Meşru Menfaat: Platform güvenliği ve hizmet kalitesi\n• Açık Rıza: Konum verisi gibi rızaya bağlı özellikler',
  },
  {
    title: '5. Veri Sahibinin Hakları (KVKK Madde 11)',
    body: 'KVKK uyarınca aşağıdaki haklara sahipsiniz:\n\n• Kişisel veri işlenip işlenmediğini öğrenme\n• İşlenmişse bilgi talep etme\n• Verilerin işlenme amacını öğrenme\n• Yurt dışı aktarım varsa bunu bilme\n• Yanlış verilerin düzeltilmesini isteme\n• Kanun\'un 7. maddesi kapsamında silinmesini isteme\n• Veri işleme faaliyetlerine itiraz etme',
  },
  {
    title: '6. Başvuru ve İletişim',
    body: 'Haklarınızı kullanmak için:\n\nE-posta: burkitas.2730@gmail.com\n\nBaşvurularınız en geç 30 gün içinde sonuçlandırılacaktır.',
  },
];

export default function KVKKScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>KVKK Aydınlatma Metni</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.updateDate}>Veri Sorumlusu: Spotlights Yönetimi | Trabzon</Text>
        <Text style={styles.intro}>
          6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, kişisel verilerinizin
          güvenliğine ve gizliliğine büyük önem veriyoruz.
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
  headerTitle: { color: '#fff', fontSize: 16, fontFamily: 'Poppins_600SemiBold' },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  updateDate: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 12, fontFamily: 'Poppins_400Regular' },
  intro: { color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 22, marginBottom: 24, fontFamily: 'Poppins_400Regular' },
  section: { marginBottom: 24 },
  sectionTitle: { color: '#fff', fontSize: 15, fontFamily: 'Poppins_600SemiBold', marginBottom: 8 },
  sectionBody: { color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 21, fontFamily: 'Poppins_400Regular' },
});
