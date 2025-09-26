"use client"

import { useState, useEffect } from "react"
import {
  ScrollView,
  StyleSheet,
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useRouter, useLocalSearchParams } from "expo-router"
import { Ionicons } from "@expo/vector-icons"

const NewClientScreen = () => {
  // Estados para almacenar los datos del formulario
  const [nombre, setNombre] = useState("")
  const [apellido, setApellido] = useState("")
  const [telefono, setTelefono] = useState("")
  const [domicilio, setDomicilio] = useState("")

  // Se usa useRouter para la navegación en Expo Router
  const router = useRouter()
  const params = useLocalSearchParams()

  useEffect(() => {
    if (params.fromContact === "true") {
      if (params.nombre) setNombre(params.nombre)
      if (params.apellido) setApellido(params.apellido)
      if (params.telefono) setTelefono(params.telefono)
    }
  }, [params])

  // Función para guardar el nuevo cliente
  const handleSaveClient = async () => {
    // Validar que todos los campos obligatorios estén llenos
    if (!nombre || !apellido || !telefono || !domicilio) {
      Alert.alert("Error", "Todos los campos son obligatorios.")
      return
    }

    // Formatear el número de teléfono con el prefijo +54
    let telefonoFormateado = telefono.trim()
    if (!telefonoFormateado.startsWith("+54")) {
      telefonoFormateado = "+54" + telefonoFormateado
    }

    try {
      // Crear el objeto del nuevo cliente
      const newClient = {
        id: Date.now().toString(),
        nombre,
        apellido,
        telefono: telefonoFormateado,
        domicilio,
      }

      // Obtener clientes existentes, agregar el nuevo y guardar
      const existingClientsJSON = await AsyncStorage.getItem("clientes")
      const existingClients = existingClientsJSON ? JSON.parse(existingClientsJSON) : []
      const updatedClients = [...existingClients, newClient]
      await AsyncStorage.setItem("clientes", JSON.stringify(updatedClients))

      // Mostrar mensaje de éxito
      Alert.alert("Éxito", "Cliente guardado correctamente.")
      // Limpiar los campos del formulario
      setNombre("")
      setApellido("")
      setTelefono("")
      setDomicilio("")
      // Redirigir a la pantalla de inicio usando Expo Router
      router.replace("/")
    } catch (error) {
      console.error("Error al guardar el cliente:", error)
      Alert.alert("Error", "No se pudo guardar el cliente.")
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.innerContainer}>
            <View style={styles.header}>
              {/* Se usa router.replace para navegar a la ruta raíz ('/') */}
              <TouchableOpacity onPress={() => router.replace("/")} style={styles.backButton}>
                <Ionicons name="home-outline" size={28} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.title}>Nuevo Cliente</Text>
            </View>

            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={styles.formContainer}>
                <Text style={styles.label}>Nombre</Text>
                <TextInput
                  style={styles.input}
                  value={nombre}
                  onChangeText={setNombre}
                  placeholder="Ej: Juan"
                  placeholderTextColor="#999"
                  returnKeyType="next"
                />

                <Text style={styles.label}>Apellido</Text>
                <TextInput
                  style={styles.input}
                  value={apellido}
                  onChangeText={setApellido}
                  placeholder="Ej: Pérez"
                  placeholderTextColor="#999"
                  returnKeyType="next"
                />

                <Text style={styles.label}>Teléfono</Text>
                <TextInput
                  style={styles.input}
                  value={telefono}
                  onChangeText={setTelefono}
                  keyboardType="phone-pad"
                  placeholder="Ej: 2396-123456"
                  placeholderTextColor="#999"
                  returnKeyType="next"
                />

                <Text style={styles.label}>Domicilio</Text>
                <TextInput
                  style={styles.input}
                  value={domicilio}
                  onChangeText={setDomicilio}
                  placeholder="Ej: Av. Balcarce 123"
                  placeholderTextColor="#999"
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />

                <TouchableOpacity style={styles.saveButton} onPress={handleSaveClient}>
                  <Text style={styles.saveButtonText}>Guardar Cliente</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2F4550",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  innerContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 30,
    backgroundColor: "#2F4550",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  backButton: {
    position: "absolute",
    left: 20,
    paddingTop: 22,
    paddingLeft: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  formContainer: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 30,
    paddingTop: 40,
    marginTop: -20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#003366",
    marginBottom: 5,
  },
  input: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    color: "#333",
  },
  saveButton: {
    backgroundColor: "#2196F3",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 10,
  },
})

export default NewClientScreen
