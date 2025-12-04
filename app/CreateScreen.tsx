import React from 'react';
import { StyleSheet, View, Text } from 'react-native';

/**
 * CreateScreen - Oluşturma ekranı
 * 
 * Şimdilik boş layout
 * Soldan sağa gesture ile buraya gelinir
 */
export default function CreateScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Create Screen</Text>
      <Text style={styles.subtext}>Bu sayfa henüz geliştirilmedi</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  subtext: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
});

