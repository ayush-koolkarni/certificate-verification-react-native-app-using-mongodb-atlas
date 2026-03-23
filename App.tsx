import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { pick } from '@react-native-documents/picker';
import RNFS from 'react-native-fs';

export default function CertificateUploader() {
  const [fileDetails, setFileDetails] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentMode, setCurrentMode] = useState(''); // 'upload' or 'verify'
  
  // Status states
  const [uploadStatus, setUploadStatus] = useState('');
  const [verificationResult, setVerificationResult] = useState('');

  const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; 
  const BACKEND_BASE_URL = 'http://YOUR_IP:3000/api'; //MAKE SURE TO CHANGE THIS TO YOUR LOCAL IP ADDRESS

  const saveHashToMongoDB = async (hash) => {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/save-hash`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer my-super-secret-certify-token-998877', 
        },
        body: JSON.stringify({
          hash: hash,
          timestamp: new Date().toISOString(), 
        }),
      });

      if (response.ok) {
        setUploadStatus('✅ Successfully Uploaded & Secured');
      } else {
        throw new Error('Backend error');
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus('❌ Upload Failed');
    }
  };

  const verifyHashInMongoDB = async (hash) => {
    try {
      const response = await fetch(`${BACKEND_BASE_URL}/verify-hash`, {
        method: 'POST', // Using POST to send the hash securely in the body
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer my-super-secret-certify-token-998877', 
        },
        body: JSON.stringify({ hash: hash }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.isLegitimate) {
          setVerificationResult('✅ 100% Legitimate Authentic Certificate');
        } else {
          setVerificationResult('🚨 ALERT: Certificate Tampered With or Not Found');
        }
      } else {
        throw new Error('Backend error');
      }
    } catch (error) {
      console.error("Verification error:", error);
      setVerificationResult('❌ Network Error during verification');
    }
  };

  const processDocument = async (mode) => {
    try {
      setIsProcessing(true);
      setCurrentMode(mode);
      setUploadStatus('');
      setVerificationResult('');
      setFileDetails(null);

      // 1. Pick the PDF
      const result = await pick({
        type: ['application/pdf'],
        copyTo: 'cachesDirectory', 
      });

      if (!Array.isArray(result) || result.length === 0) {
        setIsProcessing(false);
        return;
      }

      const file = result[0];
      const fileSize = typeof file.size === 'number' ? file.size : undefined;
      const fileName = file.name || file.fileName || file.uri?.split('/').pop() || 'Unknown';
      const filePath = file.fileCopyUri || file.uri;

      if (!filePath) {
        Alert.alert('Error', 'Unable to determine file path.');
        setIsProcessing(false);
        return;
      }

      let hashFilePath = filePath;
      if (!file.fileCopyUri && file.uri) {
        const cacheDir = RNFS.CachesDirectoryPath;
        const tempFileName = `temp_${Date.now()}_${fileName}`;
        hashFilePath = `${cacheDir}/${tempFileName}`;
        await RNFS.copyFile(file.uri, hashFilePath);
      }

      if (typeof fileSize === 'number' && fileSize > MAX_FILE_SIZE_BYTES) {
        Alert.alert('File Too Large', 'Please select a PDF smaller than 5MB.');
        setIsProcessing(false);
        return;
      }

      setFileDetails({ name: fileName, size: fileSize ?? 0 });

      // 2. Hash the PDF
      const hash = await RNFS.hash(hashFilePath, 'sha256');

      // 3. Route to the correct backend function based on the button pressed
      if (mode === 'upload') {
        await saveHashToMongoDB(hash);
      } else if (mode === 'verify') {
        await verifyHashInMongoDB(hash);
      }

      // Cleanup
      if (hashFilePath !== filePath) {
        try { await RNFS.unlink(hashFilePath); } catch (e) {}
      }

    } catch (err) {
      if (!String(err).toLowerCase().includes('cancel')) {
        Alert.alert('Error', 'Something went wrong while processing the file.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Certify Portal</Text>
      
      <TouchableOpacity 
        style={[styles.button, styles.uploadButton]} 
        onPress={() => processDocument('upload')}
        disabled={isProcessing}
      >
        <Text style={styles.buttonText}>📤 Upload & Secure Certificate</Text>
      </TouchableOpacity>

      {/* Verify Button */}
      <TouchableOpacity 
        style={[styles.button, styles.verifyButton]} 
        onPress={() => processDocument('verify')}
        disabled={isProcessing}
      >
        <Text style={styles.buttonText}>🔍 Verify Certificate</Text>
      </TouchableOpacity>

      {isProcessing && <ActivityIndicator size="large" color="#007BFF" style={styles.loader} />}

      {/* Results Container */}
      {fileDetails && !isProcessing && (
        <View style={styles.resultContainer}>
          <Text style={styles.label}>File Checked:</Text>
          <Text style={styles.value}>{fileDetails.name}</Text>

          <Text style={styles.label}>Action:</Text>
          <Text style={styles.value}>{currentMode === 'upload' ? 'Upload to Database' : 'Verification Check'}</Text>

          <Text style={styles.label}>Result:</Text>
          <Text style={[
            styles.hashValue, 
            { color: verificationResult.includes('ALERT') ? '#DC3545' : '#28A745' }
          ]}>
            {currentMode === 'upload' ? uploadStatus : verificationResult}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#F5F7FA' },
  header: { fontSize: 26, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 40 },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadButton: { backgroundColor: '#007BFF' },
  verifyButton: { backgroundColor: '#28A745' }, // Green for verify
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  loader: { marginTop: 20 },
  resultContainer: { marginTop: 30, backgroundColor: '#FFF', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#E1E4E8' },
  label: { fontSize: 14, fontWeight: '600', color: '#666', marginTop: 12 },
  value: { fontSize: 16, color: '#333', marginTop: 4 },
  hashValue: { fontSize: 16, fontWeight: 'bold', marginTop: 8 },
});