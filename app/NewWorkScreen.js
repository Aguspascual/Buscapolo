import { useState, useEffect, useCallback } from "react"
import { ScrollView, StyleSheet, SafeAreaView, View, Text, TextInput, TouchableOpacity, Alert, FlatList, Modal, Platform, KeyboardAvoidingView, Image } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useRouter, useFocusEffect } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import DateTimePicker from "@react-native-community/datetimepicker"
import * as ImagePicker from "expo-image-picker"
import * as FileSystem from "expo-file-system"
import * as Linking from "expo-linking"

const NewWorkScreen = () => {
  // Estados para almacenar los datos del formulario y la UI
  const [clientes, setClientes] = useState([])
  const [filteredClientes, setFilteredClientes] = useState([])
  const [searchText, setSearchText] = useState("")
  const [selectedClient, setSelectedClient] = useState(null)
  const [trabajo, setTrabajo] = useState("")
  const [domicilioTrabajo, setDomicilioTrabajo] = useState("")
  const [materiales, setMateriales] = useState([{ descripcion: "", cantidad: "", precio: "" }])
  const [costoManoDeObra, setCostoManoDeObra] = useState("")
  const [fecha, setFecha] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [isClientModalVisible, setClientModalVisible] = useState(false)
  const [tipoTrabajo, setTipoTrabajo] = useState(null)
  const [isWorkTypeModalVisible, setWorkTypeModalVisible] = useState(false)
  const [photos, setPhotos] = useState([]) // Nuevo estado para las fotos

  // Opciones predefinidas para el tipo de trabajo
  const workTypes = ["Aire", "Electricidad", "Cámara"]

  // Hook de navegación de expo-router
  const router = useRouter()

  // Función para obtener los clientes de AsyncStorage
  const fetchClients = async () => {
    try {
      const clientesJSON = await AsyncStorage.getItem("clientes")
      const clientesArray = clientesJSON ? JSON.parse(clientesJSON) : []
      setClientes(clientesArray)
      setFilteredClientes(clientesArray)
    } catch (error) {
      console.error("Error al cargar clientes:", error)
      Alert.alert("Error", "No se pudieron cargar los clientes.")
    }
  }

  // useFocusEffect para cargar clientes cada vez que la pantalla esté enfocada
  useFocusEffect(
    useCallback(() => {
      fetchClients()
    }, []),
  )

  // useEffect para filtrar los clientes cuando el texto de búsqueda cambia
  useEffect(() => {
    if (searchText === "") {
      setFilteredClientes(clientes)
    } else {
      const filtered = clientes.filter(
        (cliente) =>
          cliente.nombre.toLowerCase().includes(searchText.toLowerCase()) ||
          cliente.apellido.toLowerCase().includes(searchText.toLowerCase()),
      )
      setFilteredClientes(filtered)
    }
  }, [searchText, clientes])

  // Manejador para seleccionar un cliente de la lista modal
  const handleClientSelect = (cliente) => {
    setSelectedClient(cliente)
    setDomicilioTrabajo(cliente.domicilio)
    setClientModalVisible(false)
  }

  // Manejador para seleccionar un tipo de trabajo
  const handleWorkTypeSelect = (type) => {
    setTipoTrabajo(type)
    setWorkTypeModalVisible(false)
  }

  // Función para abrir la galería o la cámara y seleccionar una imagen
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== "granted") {
      Alert.alert("Permiso denegado", "Necesitamos permiso para acceder a la galería de fotos.")
      return
    }

    Alert.alert("Seleccionar Foto", "¿Deseas tomar una foto o seleccionar una de la galería?", [
      {
        text: "Tomar Foto",
        onPress: async () => {
          const cameraPermission = await ImagePicker.requestCameraPermissionsAsync()
          if (cameraPermission.status !== "granted") {
            Alert.alert("Permiso denegado", "Necesitamos permiso para usar la cámara.")
            return
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.5,
          })
          if (!result.canceled) {
            setPhotos((prevPhotos) => [...prevPhotos, ...result.assets])
          }
        },
      },
      {
        text: "Seleccionar de Galería",
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.5,
            allowsMultipleSelection: true,
          })
          if (!result.canceled) {
            setPhotos((prevPhotos) => [...prevPhotos, ...result.assets])
          }
        },
      },
      {
        text: "Cancelar",
        style: "cancel",
      },
    ])
  }

  // Función para eliminar una foto de la vista previa
  const handleRemovePhoto = (uriToRemove) => {
    setPhotos((prevPhotos) => prevPhotos.filter((photo) => photo.uri !== uriToRemove))
  }

  // Función para agregar un nuevo material
  const addMaterial = () => {
    setMateriales([...materiales, { descripcion: "", cantidad: "", precio: "" }])
  }

  // Función para eliminar un material
  const removeMaterial = (index) => {
    if (materiales.length > 1) {
      const newMateriales = materiales.filter((_, i) => i !== index)
      setMateriales(newMateriales)
    }
  }

  // Función para actualizar un material específico
  const updateMaterial = (index, field, value) => {
    const newMateriales = [...materiales]
    newMateriales[index][field] = value
    setMateriales(newMateriales)
  }

  // Calcular el total de materiales
  const calculateMaterialsTotal = () => {
    return materiales.reduce((total, material) => {
      const cantidad = Number.parseFloat(material.cantidad) || 0
      const precio = Number.parseFloat(material.precio) || 0
      return total + cantidad * precio
    }, 0)
  }

  // Calcular el total general
  const calculateTotal = () => {
    const materialsTotal = calculateMaterialsTotal()
    const laborCost = Number.parseFloat(costoManoDeObra) || 0
    return materialsTotal + laborCost
  }

  // Manejador para guardar un nuevo trabajo en AsyncStorage
  const handleSaveWork = async () => {
    // Validar que los campos obligatorios estén llenos
    if (!selectedClient || !trabajo || !domicilioTrabajo || !tipoTrabajo) {
      Alert.alert("Error", "El cliente, domicilio, tipo y descripción del trabajo son obligatorios.")
      return
    }

    // Validar que al menos un material tenga datos
    const validMaterials = materiales.filter((m) => m.descripcion.trim() !== "")
    if (validMaterials.length === 0) {
      Alert.alert("Error", "Debe agregar al menos un material.")
      return
    }

    try {
      // Obtener trabajos existentes para verificar conflictos de horario
      const existingWorksJSON = await AsyncStorage.getItem("trabajos")
      const existingWorks = existingWorksJSON ? JSON.parse(existingWorksJSON) : []

      // Verificar si ya existe un trabajo en la misma fecha y hora
      const selectedDateTime = fecha.getTime()
      const conflictingWork = existingWorks.find((work) => {
        const workDateTime = new Date(work.fecha).getTime()
        // Verificar si hay conflicto (mismo tiempo con tolerancia de 1 minuto)
        const timeDifference = Math.abs(selectedDateTime - workDateTime)
        return timeDifference < 60000 // 60000 ms = 1 minuto
      })

      if (conflictingWork) {
        const conflictDate = new Date(conflictingWork.fecha)
        Alert.alert(
          "Horario Ocupado",
          `Ya existe un trabajo programado para el ${conflictDate.toLocaleDateString()} a las ${conflictDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.\n\nCliente: ${conflictingWork.clienteNombre}\nTrabajo: ${conflictingWork.trabajo}\n\nPor favor selecciona otro horario.`,
        )
        return
      }

      // Mover las fotos a un directorio persistente
      const persistentPhotos = await Promise.all(
        photos.map(async (photo) => {
          const fileName = photo.uri.split("/").pop()
          const newUri = `${FileSystem.documentDirectory}photos/${fileName}`
          try {
            await FileSystem.copyAsync({
              from: photo.uri,
              to: newUri,
            })
            return newUri
          } catch (e) {
            console.error("Error al copiar el archivo:", e)
            return null
          }
        }),
      )

      // Crear el objeto del nuevo trabajo
      const newWork = {
        id: Date.now().toString(),
        clienteId: selectedClient.id,
        clienteNombre: `${selectedClient.nombre} ${selectedClient.apellido}`,
        domicilio: domicilioTrabajo,
        telefono: selectedClient.telefono,
        tipoTrabajo: tipoTrabajo,
        trabajo: trabajo,
        materiales: validMaterials,
        costoMateriales: calculateMaterialsTotal(),
        costoManoDeObra: Number.parseFloat(costoManoDeObra) || 0,
        total: calculateTotal(),
        fecha: fecha.toISOString(),
        photos: persistentPhotos.filter((uri) => uri !== null),
        estadoPago: "Pendiente",
      }

      // Agregar el nuevo trabajo a los existentes y guardarlos
      const updatedWorks = [...existingWorks, newWork]
      await AsyncStorage.setItem("trabajos", JSON.stringify(updatedWorks))

      Alert.alert(
        "Trabajo Guardado",
        "El trabajo se guardó correctamente. ¿Deseas enviar un comprobante al cliente por WhatsApp?",
        [
          {
            text: "No",
            style: "cancel",
            onPress: () => {
              // Limpiar formulario y navegar
              setSelectedClient(null)
              setTrabajo("")
              setDomicilioTrabajo("")
              setMateriales([{ descripcion: "", cantidad: "", precio: "" }])
              setCostoManoDeObra("")
              setFecha(new Date())
              setSearchText("")
              setTipoTrabajo(null)
              setPhotos([])
              router.replace("/")
            },
          },
          {
            text: "Sí, Enviar",
            onPress: () => {
              // Crear mensaje de WhatsApp
              const fechaFormateada = new Date(newWork.fecha).toLocaleDateString("es-ES", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })
              const horaFormateada = new Date(newWork.fecha).toLocaleTimeString("es-ES", {
                hour: "2-digit",
                minute: "2-digit",
              })

              const materialesTexto = newWork.materiales
                .map(
                  (m) =>
                    `• ${m.descripcion} - Cant: ${m.cantidad} - $${(Number.parseFloat(m.cantidad) * Number.parseFloat(m.precio)).toFixed(2)}`,
                )
                .join("\n")

              const mensaje = `🔧 *COMPROBANTE DE TRABAJO PROGRAMADO*

👤 *Cliente:* ${newWork.clienteNombre}
📍 *Domicilio:* ${newWork.domicilio}
🗓️ *Fecha:* ${fechaFormateada}
⏰ *Hora:* ${horaFormateada}
⚡ *Tipo:* ${newWork.tipoTrabajo}

📝 *Descripción del trabajo:*
${newWork.trabajo}

🛠️ *Materiales:*
${materialesTexto}

💰 *Costos:*
• Materiales: $${newWork.costoMateriales.toFixed(2)}
• Mano de obra: $${newWork.costoManoDeObra.toFixed(2)}
• *TOTAL: $${newWork.total.toFixed(2)}*

✅ Estado: ${newWork.estadoPago}

¡Nos vemos el día programado!`

              const phoneNumber = selectedClient.telefono.replace(/\D/g, "")
              const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(mensaje)}`

              // Intenta abrir WhatsApp directamente con el objeto Linking
              Linking.canOpenURL(whatsappUrl).then((supported) => {
                if (supported) {
                  Linking.openURL(whatsappUrl)
                } else {
                  Alert.alert("Error", "No se pudo abrir WhatsApp. Asegúrate de tenerlo instalado.")
                }
              })
            },
          },
        ],
      )
    } catch (error) {
      console.error("Error al guardar el trabajo:", error)
      Alert.alert("Error", "No se pudo guardar el trabajo.")
    }
  }

  // Renderiza cada item de la lista de clientes en el modal
  const renderClientItem = ({ item }) => (
    <TouchableOpacity style={styles.modalItem} onPress={() => handleClientSelect(item)}>
      <Text style={styles.modalItemText}>
        {item?.nombre || ""} {item?.apellido || ""}
      </Text>
    </TouchableOpacity>
  )

  // Renderiza cada item de la lista de fotos
  const renderPhotoItem = ({ item }) => (
    <View style={styles.photoPreviewContainer}>
      <Image source={{ uri: item.uri }} style={styles.photoPreview} />
      <TouchableOpacity onPress={() => handleRemovePhoto(item.uri)} style={styles.removePhotoButton}>
        <Ionicons name="close-circle-sharp" size={24} color="#C42A2A" />
      </TouchableOpacity>
    </View>
  )

  // Renderiza cada material en la lista
  const renderMaterialItem = ({ item, index }) => (
    <View style={styles.materialContainer}>
      <View style={styles.materialHeader}>
        <Text style={styles.materialTitle}>Material {index + 1}</Text>
        {materiales.length > 1 && (
          <TouchableOpacity onPress={() => removeMaterial(index)} style={styles.removeMaterialButton}>
            <Ionicons name="trash-outline" size={20} color="#C42A2A" />
          </TouchableOpacity>
        )}
      </View>

      <TextInput
        style={styles.input}
        value={item.descripcion}
        onChangeText={(value) => updateMaterial(index, "descripcion", value)}
        placeholder="Descripción del material"
        placeholderTextColor="#999"
      />

      <View style={styles.materialRow}>
        <TextInput
          style={[styles.input, styles.materialInput]}
          value={item.cantidad}
          onChangeText={(value) => updateMaterial(index, "cantidad", value)}
          placeholder="Cantidad"
          placeholderTextColor="#999"
          keyboardType="numeric"
        />
        <TextInput
          style={[styles.input, styles.materialInput]}
          value={item.precio}
          onChangeText={(value) => updateMaterial(index, "precio", value)}
          placeholder="Precio c/u"
          placeholderTextColor="#999"
          keyboardType="numeric"
        />
      </View>

      {item.cantidad && item.precio && (
        <Text style={styles.subtotalText}>
          Subtotal: ${(Number.parseFloat(item.cantidad) * Number.parseFloat(item.precio)).toFixed(2)}
        </Text>
      )}
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/")} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Nuevo Trabajo</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.formContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.label}>Cliente</Text>
          <TouchableOpacity style={styles.selectButton} onPress={() => setClientModalVisible(true)}>
            <Text style={styles.selectButtonText}>
              {selectedClient
                ? `${selectedClient.nombre || ""} ${selectedClient.apellido || ""}`
                : "Seleccionar cliente"}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#2F4550" />
          </TouchableOpacity>

          {/* Mostrar domicilio y teléfono solo si se ha seleccionado un cliente */}
          {selectedClient && (
            <View>
              <Text style={styles.label}>Domicilio</Text>
              <TextInput
                style={styles.input}
                value={domicilioTrabajo || ""}
                onChangeText={setDomicilioTrabajo}
                placeholder="Escribe el domicilio del trabajo"
                placeholderTextColor="#999"
              />
              <Text style={styles.label}>Teléfono</Text>
              <TextInput
                style={styles.input}
                value={selectedClient?.telefono || ""}
                editable={false}
                placeholderTextColor="#999"
              />
            </View>
          )}

          <Text style={styles.label}>Fecha y Hora</Text>
          <View style={styles.dateTimeContainer}>
            <TouchableOpacity style={styles.selectDateTimeButton} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.selectButtonText}>{fecha ? fecha.toLocaleDateString() : "Seleccionar fecha"}</Text>
              <Ionicons name="calendar" size={20} color="#2F4550" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.selectDateTimeButton} onPress={() => setShowTimePicker(true)}>
              <Text style={styles.selectButtonText}>
                {fecha ? fecha.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Seleccionar hora"}
              </Text>
              <Ionicons name="time" size={20} color="#2F4550" />
            </TouchableOpacity>
          </View>

          {/* Selector de tipo de trabajo */}
          <Text style={styles.label}>Tipo de Trabajo</Text>
          <TouchableOpacity style={styles.selectButton} onPress={() => setWorkTypeModalVisible(true)}>
            <Text style={styles.selectButtonText}>{tipoTrabajo || "Seleccionar tipo de trabajo"}</Text>
            <Ionicons name="chevron-down" size={20} color="#2F4550" />
          </TouchableOpacity>

          {/* DateTimePicker para la fecha */}
          {showDatePicker && (
            <DateTimePicker
              value={fecha}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(event, selectedDate) => {
                setShowDatePicker(false)
                if (selectedDate) setFecha(selectedDate)
              }}
            />
          )}

          {/* DateTimePicker para la hora */}
          {showTimePicker && (
            <DateTimePicker
              value={fecha}
              mode="time"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={(event, selectedTime) => {
                setShowTimePicker(false)
                if (selectedTime) setFecha(selectedTime)
              }}
            />
          )}

          <Text style={styles.label}>Descripción del trabajo</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={trabajo || ""}
            onChangeText={setTrabajo}
            placeholder="Escribe aquí los detalles del trabajo"
            placeholderTextColor="#999"
            multiline
          />

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Materiales</Text>
            <TouchableOpacity onPress={addMaterial} style={styles.addButton}>
              <Ionicons name="add-circle" size={28} color="#2F4550" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={materiales}
            renderItem={renderMaterialItem}
            keyExtractor={(item, index) => index.toString()}
            scrollEnabled={false}
          />

          <Text style={styles.label}>Costo de Mano de Obra</Text>
          <TextInput
            style={styles.input}
            value={costoManoDeObra || ""}
            onChangeText={setCostoManoDeObra}
            placeholder="Costo de la mano de obra"
            placeholderTextColor="#999"
            keyboardType="numeric"
          />

          {/* Resumen de totales */}
          <View style={styles.totalContainer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Materiales:</Text>
              <Text style={styles.totalValue}>${calculateMaterialsTotal().toFixed(2)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Mano de Obra:</Text>
              <Text style={styles.totalValue}>${(Number.parseFloat(costoManoDeObra) || 0).toFixed(2)}</Text>
            </View>
            <View style={[styles.totalRow, styles.finalTotal]}>
              <Text style={styles.finalTotalLabel}>TOTAL:</Text>
              <Text style={styles.finalTotalValue}>${calculateTotal().toFixed(2)}</Text>
            </View>
          </View>

          {/* Sección de fotos */}
          <Text style={styles.label}>Fotos</Text>
          <TouchableOpacity style={styles.imageButton} onPress={handlePickImage}>
            <Ionicons name="image" size={24} color="#fff" />
            <Text style={styles.imageButtonText}>Agregar Fotos</Text>
          </TouchableOpacity>

          {photos.length > 0 && (
            <FlatList
              data={photos}
              renderItem={renderPhotoItem}
              keyExtractor={(item, index) => index.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.photoList}
            />
          )}

          <TouchableOpacity style={styles.saveButton} onPress={handleSaveWork}>
            <Text style={styles.saveButtonText}>Guardar Trabajo</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal para seleccionar clientes */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isClientModalVisible}
        onRequestClose={() => setClientModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Cliente</Text>
              <TouchableOpacity
                onPress={() => {
                  setClientModalVisible(false)
                  router.push("NewClientScreen")
                }}
                style={styles.addNewClientButton}
              >
                <Ionicons name="add-circle" size={30} color="#2F4550" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#2F4550" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                value={searchText}
                onChangeText={setSearchText}
                placeholder="Buscar por nombre o apellido"
                placeholderTextColor="#999"
              />
            </View>

            <FlatList
              data={filteredClientes}
              keyExtractor={(item) => item.id}
              renderItem={renderClientItem}
              ListEmptyComponent={() => <Text style={styles.emptyListText}>No se encontraron clientes.</Text>}
            />

            <TouchableOpacity onPress={() => setClientModalVisible(false)} style={styles.closeModalButton}>
              <Text style={styles.closeModalButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal para seleccionar tipo de trabajo */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isWorkTypeModalVisible}
        onRequestClose={() => setWorkTypeModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Seleccionar Tipo de Trabajo</Text>
            {workTypes.map((type) => (
              <TouchableOpacity key={type} style={styles.modalItem} onPress={() => handleWorkTypeSelect(type)}>
                <Text style={styles.modalItemText}>{type || ""}</Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity onPress={() => setWorkTypeModalVisible(false)} style={styles.closeModalButton}>
              <Text style={styles.closeModalButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

// Estilos del componente
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2F4550",
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingBottom: 40,
    paddingTop: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginRight: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFF",
    flex: 1,
    textAlign: "center",
    marginRight: 40, // Compensar el botón de retroceso
  },
  formContainer: {
    flex: 1,
    backgroundColor: "#FFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    marginTop: -20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2F4550",
    marginBottom: 8,
    marginTop: 5,
  },
  input: {
    backgroundColor: "#F5F7FA",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
    color: "#2F4550",
    borderWidth: 1,
    borderColor: "#E1E5EA",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  selectButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E1E5EA",
  },
  selectButtonText: {
    fontSize: 16,
    color: "#2F4550",
  },
  dateTimeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  selectDateTimeButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
    borderRadius: 12,
    padding: 16,
    width: "48%",
    borderWidth: 1,
    borderColor: "#E1E5EA",
  },
  saveButton: {
    backgroundColor: "#2F4550",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 25,
    width: "85%",
    maxHeight: "70%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2F4550",
    textAlign: "center",
  },
  addNewClientButton: {
    padding: 5,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E1E5EA",
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#2F4550",
  },
  modalItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E1E5EA",
  },
  modalItemText: {
    fontSize: 16,
    color: "#2F4550",
  },
  closeModalButton: {
    backgroundColor: "#2F4550",
    padding: 15,
    borderRadius: 12,
    marginTop: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  closeModalButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyListText: {
    textAlign: "center",
    marginTop: 20,
    fontSize: 16,
    color: "#999",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2F4550",
  },
  addButton: {
    padding: 5,
  },
  materialContainer: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E1E5EA",
  },
  materialHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  materialTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2F4550",
  },
  removeMaterialButton: {
    padding: 5,
  },
  materialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  materialInput: {
    width: "48%",
    marginBottom: 10,
  },
  subtotalText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2F4550",
    textAlign: "right",
    marginTop: -10,
  },
  totalContainer: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#E1E5EA",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: "#2F4550",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2F4550",
  },
  finalTotal: {
    borderTopWidth: 2,
    borderTopColor: "#2F4550",
    paddingTop: 10,
    marginTop: 10,
  },
  finalTotalLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2F4550",
  },
  finalTotalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2F4550",
  },
  imageButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2F4550",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 15,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  imageButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
  },
  photoList: {
    marginBottom: 20,
  },
  photoPreviewContainer: {
    marginRight: 10,
    position: "relative",
  },
  photoPreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: "#FFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
})

export default NewWorkScreen