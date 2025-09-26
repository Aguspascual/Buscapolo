"use client"

import { useEffect, useState } from "react"
import {
  ScrollView,
  StyleSheet,
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  Alert,
  FlatList,
  Modal,
  Dimensions,
  TextInput,
  Linking,
} from "react-native"
import { Image } from "expo-image"
import { useRouter, useLocalSearchParams } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as FileSystem from "expo-file-system"
import DateTimePicker from "@react-native-community/datetimepicker"

const WorkDetailScreen = () => {
  const router = useRouter()
  const { trabajo: trabajoJSON } = useLocalSearchParams()
  const [trabajo, setTrabajo] = useState(JSON.parse(trabajoJSON))
  const [photoUris, setPhotoUris] = useState([])
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [newDate, setNewDate] = useState(new Date())
  const [reprogramModalVisible, setReprogramModalVisible] = useState(false)
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false)
  const [showEditPriceModal, setShowEditPriceModal] = useState(false)
  const [isEditingAddress, setIsEditingAddress] = useState(false) // NUEVO: Estado para controlar la edición del domicilio
  const [editedAddress, setEditedAddress] = useState(trabajo.domicilio) // NUEVO: Estado para el domicilio editable
  const [newMaterial, setNewMaterial] = useState({
    descripcion: "",
    cantidad: "",
    precio: "",
  })
  const [newWorkPrice, setNewWorkPrice] = useState((Number.parseFloat(trabajo.costoManoDeObra) || 0).toString())

  // Calcula el costo total basado en los materiales y la mano de obra del objeto de trabajo
  const costoTotal =
    (Number.parseFloat(trabajo.costoMateriales) || 0) + (Number.parseFloat(trabajo.costoManoDeObra) || 0)

  useEffect(() => {
    console.log("Fotos del trabajo:", trabajo.photos)
    checkPhotos()
    // Asegurarse de que el objeto trabajo tenga una propiedad 'materiales'
    if (!trabajo.materiales) {
      setTrabajo((prevTrabajo) => ({ ...prevTrabajo, materiales: [] }))
    }
    // NUEVO: Auto-completar domicilio si está vacío
    if (!trabajo.domicilio || trabajo.domicilio.trim() === "") {
      fetchClientAddress()
    }
  }, [])

  // NUEVO: Función para buscar y auto-completar el domicilio
  const fetchClientAddress = async () => {
    try {
      const clientesJSON = await AsyncStorage.getItem("clientes")
      if (clientesJSON) {
        const clientes = JSON.parse(clientesJSON)
        const clienteEncontrado = clientes.find((c) => c.nombre === trabajo.clienteNombre)
        if (clienteEncontrado && clienteEncontrado.domicilio) {
          const trabajoActualizado = { ...trabajo, domicilio: clienteEncontrado.domicilio }
          setTrabajo(trabajoActualizado)
          setEditedAddress(clienteEncontrado.domicilio)
          // Opcional: guardar el domicilio actualizado en AsyncStorage
          const trabajosJSON = await AsyncStorage.getItem("trabajos")
          const trabajos = trabajosJSON ? JSON.parse(trabajosJSON) : []
          const trabajosGuardados = trabajos.map((t) => (t.id === trabajo.id ? trabajoActualizado : t))
          await AsyncStorage.setItem("trabajos", JSON.stringify(trabajosGuardados))
        }
      }
    } catch (error) {
      console.error("Error al buscar el domicilio del cliente:", error)
    }
  }

  const checkPhotos = async () => {
    if (trabajo.photos && trabajo.photos.length > 0) {
      const validPhotos = []
      for (const photoUri of trabajo.photos) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(photoUri)
          if (fileInfo.exists) {
            validPhotos.push(photoUri)
          } else {
            console.log("Foto no encontrada:", photoUri)
          }
        } catch (error) {
          console.log("Error verificando foto:", photoUri, error)
        }
      }
      setPhotoUris(validPhotos)
    }
  }

  const getEstadoPagoColor = (estado) => {
    switch (estado) {
      case "Pagado":
        return "#4CAF50"
      case "Pendiente":
        return "#FF9800"
      case "Cancelado":
        return "#F44336"
      default:
        return "#666"
    }
  }

  const getEstadoPagoIcon = (estado) => {
    switch (estado) {
      case "Pagado":
        return "checkmark-circle"
      case "Pendiente":
        return "time"
      case "Cancelado":
        return "close-circle"
      default:
        return "time"
    }
  }

  const cambiarEstadoPago = async (nuevoEstado) => {
    if (nuevoEstado === "Cancelado") {
      setReprogramModalVisible(true)
      return
    }

    try {
      const trabajosJSON = await AsyncStorage.getItem("trabajos")
      const trabajos = trabajosJSON ? JSON.parse(trabajosJSON) : []

      const trabajosActualizados = trabajos.map((t) => (t.id === trabajo.id ? { ...t, estadoPago: nuevoEstado } : t))

      await AsyncStorage.setItem("trabajos", JSON.stringify(trabajosActualizados))
      setTrabajo({ ...trabajo, estadoPago: nuevoEstado })
      Alert.alert("Éxito", `Estado de pago cambiado a "${nuevoEstado}"`)
    } catch (error) {
      console.error("Error al cambiar estado de pago:", error)
      Alert.alert("Error", "No se pudo cambiar el estado de pago")
    }
  }

  const handleReprogramar = () => {
    setReprogramModalVisible(false)
    setShowDatePicker(true)
  }

  const handleEliminarTrabajo = async () => {
    setReprogramModalVisible(false)

    try {
      const trabajosJSON = await AsyncStorage.getItem("trabajos")
      const trabajos = trabajosJSON ? JSON.parse(trabajosJSON) : []
      const trabajosActualizados = trabajos.filter((t) => t.id !== trabajo.id)

      await AsyncStorage.setItem("trabajos", JSON.stringify(trabajosActualizados))
      Alert.alert("Trabajo eliminado", "El trabajo ha sido eliminado correctamente.", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ])
    } catch (error) {
      console.error("Error al eliminar trabajo:", error)
      Alert.alert("Error", "No se pudo eliminar el trabajo")
    }
  }

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false)
    if (selectedDate) {
      setNewDate(selectedDate)
      setShowTimePicker(true)
    }
  }

  const onTimeChange = async (event, selectedTime) => {
    setShowTimePicker(false)
    if (selectedTime) {
      const updatedDate = new Date(newDate)
      updatedDate.setHours(selectedTime.getHours())
      updatedDate.setMinutes(selectedTime.getMinutes())

      try {
        const trabajosJSON = await AsyncStorage.getItem("trabajos")
        const trabajos = trabajosJSON ? JSON.parse(trabajosJSON) : []

        const trabajosActualizados = trabajos.map((t) =>
          t.id === trabajo.id ? { ...t, fecha: updatedDate.toISOString(), estadoPago: "Pendiente" } : t,
        )

        await AsyncStorage.setItem("trabajos", JSON.stringify(trabajosActualizados))
        setTrabajo({ ...trabajo, fecha: updatedDate.toISOString(), estadoPago: "Pendiente" })
        Alert.alert(
          "Trabajo reprogramado",
          `El trabajo ha sido reprogramado para el ${format(updatedDate, "dd/MM/yyyy 'a las' HH:mm", { locale: es })}`,
        )
      } catch (error) {
        console.error("Error al reprogramar trabajo:", error)
        Alert.alert("Error", "No se pudo reprogramar el trabajo")
      }
    }
  }

  const openPhotoModal = (index) => {
    setSelectedPhotoIndex(index)
    setModalVisible(true)
  }

  const navigatePhoto = (direction) => {
    if (direction === "next" && selectedPhotoIndex < photoUris.length - 1) {
      setSelectedPhotoIndex(selectedPhotoIndex + 1)
    } else if (direction === "prev" && selectedPhotoIndex > 0) {
      setSelectedPhotoIndex(selectedPhotoIndex - 1)
    }
  }

  // Maneja la adición de un material
  const handleAddMaterial = async () => {
    if (!newMaterial.descripcion || !newMaterial.cantidad || !newMaterial.precio) {
      Alert.alert("Error", "Por favor, completa todos los campos del material.")
      return
    }

    const materialToAdd = {
      descripcion: newMaterial.descripcion,
      cantidad: Number(newMaterial.cantidad),
      precio: Number(newMaterial.precio),
    }

    const nuevosMateriales = [...(trabajo.materiales || []), materialToAdd]

    // Recalcular el costo de materiales
    const nuevoCostoMateriales = nuevosMateriales.reduce(
      (sum, item) => sum + Number(item.cantidad) * Number(item.precio),
      0,
    )

    const trabajoActualizado = {
      ...trabajo,
      materiales: nuevosMateriales,
      costoMateriales: nuevoCostoMateriales,
      costoTotal: nuevoCostoMateriales + (Number.parseFloat(trabajo.costoManoDeObra) || 0),
    }

    // Actualizar el estado local
    setTrabajo(trabajoActualizado)
    // Cerrar el modal y resetear los campos
    setShowAddMaterialModal(false)
    setNewMaterial({ descripcion: "", cantidad: "", precio: "" })

    try {
      // Guardar el trabajo actualizado en AsyncStorage
      const trabajosJSON = await AsyncStorage.getItem("trabajos")
      const trabajos = trabajosJSON ? JSON.parse(trabajosJSON) : []
      const trabajosGuardados = trabajos.map((t) => (t.id === trabajo.id ? trabajoActualizado : t))
      await AsyncStorage.setItem("trabajos", JSON.stringify(trabajosGuardados))
      Alert.alert("Éxito", "Material agregado correctamente y costos actualizados.")
    } catch (error) {
      console.error("Error al agregar material:", error)
      Alert.alert("Error", "No se pudo agregar el material.")
    }
  }

  // Maneja la eliminación de un material
  const handleDeleteMaterial = async (indexToDelete) => {
    Alert.alert("Confirmar Eliminación", "¿Estás seguro de que quieres eliminar este material?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        onPress: async () => {
          const nuevosMateriales = trabajo.materiales.filter((_, index) => index !== indexToDelete)

          const nuevoCostoMateriales = nuevosMateriales.reduce(
            (sum, item) => sum + Number(item.cantidad) * Number(item.precio),
            0,
          )

          const trabajoActualizado = {
            ...trabajo,
            materiales: nuevosMateriales,
            costoMateriales: nuevoCostoMateriales,
            costoTotal: nuevoCostoMateriales + (Number.parseFloat(trabajo.costoManoDeObra) || 0),
          }

          setTrabajo(trabajoActualizado)

          try {
            const trabajosJSON = await AsyncStorage.getItem("trabajos")
            const trabajos = trabajosJSON ? JSON.parse(trabajosJSON) : []
            const trabajosGuardados = trabajos.map((t) => (t.id === trabajo.id ? trabajoActualizado : t))
            await AsyncStorage.setItem("trabajos", JSON.stringify(trabajosGuardados))
            Alert.alert("Éxito", "Material eliminado correctamente y costos actualizados.")
          } catch (error) {
            console.error("Error al eliminar material y actualizar el trabajo:", error)
            Alert.alert("Error", "No se pudo eliminar el material.")
          }
        },
      },
    ])
  }

  // NUEVO: Función para guardar el domicilio editado
  const handleSaveAddress = async () => {
    try {
      const trabajosJSON = await AsyncStorage.getItem("trabajos")
      const trabajos = trabajosJSON ? JSON.parse(trabajosJSON) : []
      const trabajoActualizado = { ...trabajo, domicilio: editedAddress }
      const trabajosGuardados = trabajos.map((t) => (t.id === trabajo.id ? trabajoActualizado : t))
      await AsyncStorage.setItem("trabajos", JSON.stringify(trabajosGuardados))
      setTrabajo(trabajoActualizado)
      setIsEditingAddress(false)
      Alert.alert("Éxito", "Domicilio actualizado correctamente.")
    } catch (error) {
      console.error("Error al actualizar el domicilio:", error)
      Alert.alert("Error", "No se pudo actualizar el domicilio.")
    }
  }

  // NUEVO: Función para llamar al número de teléfono
  const handleCall = () => {
    if (trabajo.telefono) {
      Linking.openURL(`tel:${trabajo.telefono}`)
    }
  }

  // NUEVO: Función para abrir WhatsApp
  const handleWhatsApp = () => {
    if (trabajo.telefono) {
      const whatsappURL = `whatsapp://send?phone=${trabajo.telefono}`
      Linking.canOpenURL(whatsappURL).then((supported) => {
        if (supported) {
          Linking.openURL(whatsappURL)
        } else {
          Alert.alert("Error", "WhatsApp no está instalado en este dispositivo.")
        }
      })
    }
  }

  // NUEVO: Maneja la actualización del precio de mano de obra
  const handleUpdateWorkPrice = async () => {
    if (newWorkPrice === "" || isNaN(Number(newWorkPrice))) {
      Alert.alert("Error", "Por favor, ingrese un precio válido.")
      return
    }
    const costoManoDeObraActualizado = Number(newWorkPrice)

    const trabajoActualizado = {
      ...trabajo,
      costoManoDeObra: costoManoDeObraActualizado,
      costoTotal: (Number.parseFloat(trabajo.costoMateriales) || 0) + costoManoDeObraActualizado,
    }

    setTrabajo(trabajoActualizado)
    setShowEditPriceModal(false)

    try {
      const trabajosJSON = await AsyncStorage.getItem("trabajos")
      const trabajos = trabajosJSON ? JSON.parse(trabajosJSON) : []
      const trabajosGuardados = trabajos.map((t) => (t.id === trabajo.id ? trabajoActualizado : t))
      await AsyncStorage.setItem("trabajos", JSON.stringify(trabajosGuardados))
      Alert.alert("Éxito", "Precio del trabajo actualizado correctamente.")
    } catch (error) {
      console.error("Error al actualizar el precio del trabajo:", error)
      Alert.alert("Error", "No se pudo actualizar el precio del trabajo.")
    }
  }

  const renderPhotoItem = ({ item, index }) => (
    <TouchableOpacity style={styles.photoPreviewContainer} onPress={() => openPhotoModal(index)} activeOpacity={0.8}>
      <Image
        source={{ uri: item }}
        style={styles.photoPreview}
        onError={(error) => console.log("Error al cargar la imagen:", error)}
      />
      <View style={styles.photoOverlay}>
        <Ionicons name="expand-outline" size={24} color="white" />
      </View>
    </TouchableOpacity>
  )

  const renderMaterialItem = ({ item, index }) => (
    <View style={styles.materialItem}>
      <View style={styles.materialHeader}>
        <Text style={styles.materialNumber}>{index + 1}.</Text>
        <Text style={styles.materialDescription}>{item.descripcion}</Text>
        <TouchableOpacity style={styles.deleteMaterialButton} onPress={() => handleDeleteMaterial(index)}>
         <Ionicons name="trash-outline" size={24} color="#F44336" />
        </TouchableOpacity>
      </View>
      <View style={styles.materialDetails}>
        <Text style={styles.materialQuantity}>Cantidad: {item.cantidad}</Text>
        <Text style={styles.materialPrice}>
          Precio c/u: ${Number.parseFloat(item.precio).toFixed(2)}
        </Text>
        <Text style={styles.materialSubtotal}> Subtotal: $ 
          {(Number.parseFloat(item.cantidad) * Number.parseFloat(item.precio)).toFixed(2)}
        </Text>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back-outline" size={28} color="#fff" />
        </TouchableOpacity>
         <Text style={styles.title}>Detalles del Trabajo</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.detailsContainer}>
        {/* Estado del pago */} 
          <View style={[styles.detailItem, { borderLeftWidth: 4, borderLeftColor: getEstadoPagoColor(trabajo.estadoPago) }]}>   
            <View style={styles.estadoContainer}>  
              <View style={styles.estadoInfo}>
                  <Text style={styles.label}>Estado de Pago:</Text> 
                <View style={styles.estadoBadge}>    
                  <Ionicons
                    name={getEstadoPagoIcon(trabajo.estadoPago)}
                    size={20}
                    color={getEstadoPagoColor(trabajo.estadoPago)}
                  />  
                  <Text style={[styles.estadoText, { color: getEstadoPagoColor(trabajo.estadoPago) }]}>
                    {trabajo.estadoPago || "Pendiente"}  
                  </Text>
                </View>
              </View>
              <View style={styles.botonesContainer}>
                {trabajo.estadoPago !== "Pagado" && (
                  <TouchableOpacity
                    style={[styles.estadoButton, styles.estadoButtonSuccess]}
                    onPress={() => cambiarEstadoPago("Pagado")}
                    activeOpacity={0.8}
                  >
                        <Ionicons name="checkmark-circle" size={24} color="white" />   
                    <Text style={styles.estadoButtonText}>Marcar como Pagado</Text>  
                  </TouchableOpacity>
                )}
                 
                {trabajo.estadoPago !== "Cancelado" && trabajo.estadoPago !== "Pagado" && (
                  <TouchableOpacity
                    style={[styles.estadoButton, styles.estadoButtonDanger]}
                    onPress={() => cambiarEstadoPago("Cancelado")}
                    activeOpacity={0.8}
                  >
                        <Ionicons name="close-circle" size={24} color="white" />   
                    <Text style={styles.estadoButtonText}>Marcar como Cancelado</Text>  
                  </TouchableOpacity>
                )}
                 
              </View>
            </View>
          </View>
            {/* Información del cliente */} 
          <View style={styles.detailItem}>
               <Text style={styles.label}>Cliente:</Text>  
            <Text style={styles.value}>{trabajo.clienteNombre}</Text> 
          </View>
            {/* Campo de domicilio */} 
          <View style={styles.detailItem}>
               <Text style={styles.label}>Domicilio:</Text> 
            <View style={styles.editableContainer}>
                
              <TextInput
                style={styles.editableInput}
                value={editedAddress}
                onChangeText={setEditedAddress}
                editable={true}
                multiline={true}
              />
                 
              <TouchableOpacity onPress={handleSaveAddress} style={styles.saveButton}>
                  <Ionicons name="save-outline" size={24} color="#003366" /> 
              </TouchableOpacity>
            </View>
             
          </View>
            {/* Telefono con iconos de llamada y WhatsApp */} 
          <View style={styles.detailItem}>
               <Text style={styles.label}>Teléfono:</Text>  
            <View style={styles.phoneContainer}>
                  <Text style={styles.value}>{trabajo.telefono}</Text> 
              <View style={styles.phoneIcons}>
                <TouchableOpacity onPress={handleCall} style={styles.phoneButton}>
                     <Ionicons name="call-outline" size={24} color="#003366" /> 
                </TouchableOpacity>
                 
                <TouchableOpacity onPress={handleWhatsApp} style={styles.phoneButton}>
                     <Ionicons name="logo-whatsapp" size={24} color="#25D366" /> 
                </TouchableOpacity>
              </View>
            </View>
          </View>
           
          <View style={styles.detailItem}>
            <Text style={styles.label}>Fecha:</Text>
            <Text style={styles.value}>
              {format(new Date(trabajo.fecha), "HH:mm dd MMMM", { locale: es })}
            </Text>
          </View>
           
          <View style={styles.detailItem}>
               <Text style={styles.label}>Tipo de Trabajo:</Text>  
            <Text style={styles.value}>{trabajo.tipoTrabajo || "No especificado"}</Text> 
          </View>
           
          <View style={styles.detailItem}>
               <Text style={styles.label}>Descripción del trabajo:</Text>  
            <Text style={styles.value}>{trabajo.trabajo}</Text> 
          </View>
            {/* Sección de materiales */}
          <View style={styles.materialesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Materiales</Text>
              <TouchableOpacity style={styles.addButton} onPress={() => setShowAddMaterialModal(true)}>
                <Ionicons name="add-circle-outline" size={20} color="#FFF" />
                <Text style={styles.addButtonText}>Agregar</Text>
              </TouchableOpacity>
            </View>

            {trabajo.materiales && trabajo.materiales.length > 0 ? (
              <FlatList data={trabajo.materiales} renderItem={renderMaterialItem} keyExtractor={(item, index) => index.toString()} scrollEnabled={false}/>
            ) : (
              <Text style={styles.noMaterialsText}>No hay materiales registrados.</Text>
            )}
          </View>
          <View style={styles.costosSection}>
            <View style={styles.costoItem}>
              <Text style={styles.costoLabel}>Costo de Materiales:</Text>
              <Text style={styles.costoValueMateriales}>${(Number.parseFloat(trabajo.costoMateriales) || 0).toFixed(2)}</Text>
            </View>

            <View style={styles.costoItem}>
              <Text style={styles.costoLabel}>Costo de Mano de Obra:</Text>
              <TouchableOpacity onPress={() => setShowEditPriceModal(true)} style={styles.editPriceButton}>
                <Text style={styles.costoValueManoObra}>${(Number.parseFloat(trabajo.costoManoDeObra) || 0).toFixed(2)}</Text>
                <Ionicons name="pencil-outline" size={16} color="#2F4550" style={{ marginLeft: 5 }} />
              </TouchableOpacity>
            </View>

            <View style={[styles.costoItem, styles.totalFinal]}>
              <Text style={styles.totalLabel}>Costo Total:</Text>
              <Text style={styles.totalValue}>${costoTotal.toFixed(2)}</Text>
            </View>
          </View>
           {/* Fotos del trabajo */}
          <View style={styles.photoSection}>
             <Text style={styles.sectionTitle}>Fotos del Trabajo</Text>
            {photoUris.length > 0 ? (
              <FlatList data={photoUris} renderItem={renderPhotoItem} keyExtractor={(item, index) => index.toString()} horizontal showsHorizontalScrollIndicator={false} style={styles.photoList} />
            ) : (
              <Text style={styles.noPhotosText}>
                {trabajo.photos && trabajo.photos.length > 0 ? "Las fotos no están disponibles" : "No hay fotos para este trabajo"}
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
      {/* Modal de confirmación para reprogramar/eliminar */}
      <Modal visible={reprogramModalVisible} transparent={true} animationType="slide" onRequestClose={() => setReprogramModalVisible(false)}>
        <View style={styles.modalContainerReprogramar}>
          <View style={styles.modalContentReprogramar}>
             <Text style={styles.modalTitleReprogramar}>¿Qué deseas hacer con este trabajo?</Text>
            <TouchableOpacity style={styles.confirmButtonReprogramar} onPress={handleReprogramar}>
              <Ionicons name="calendar-outline" size={24} color="white" />
              <Text style={styles.confirmButtonTextReprogrmar}>Reprogramar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButtonReprogramar} onPress={handleEliminarTrabajo}>
               <Ionicons name="trash-outline" size={24} color="white" />
              <Text style={styles.deleteButtonTextEliminar}>Eliminar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setReprogramModalVisible(false)}>
               <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
       {/* Modal para agregar un material */}
      <Modal visible={showAddMaterialModal} transparent={true} animationType="fade" onRequestClose={() => setShowAddMaterialModal(false)} >
        <View style={styles.modalContainer}>
          <View style={styles.addMaterialModalContent}>
            <Text style={styles.modalTitle}>Agregar Material</Text>
            <TextInput style={styles.input} placeholder="Descripción del material" value={newMaterial.descripcion} onChangeText={(text) => setNewMaterial({ ...newMaterial, descripcion: text })} />
            <TextInput style={styles.input} placeholder="Cantidad" value={newMaterial.cantidad} onChangeText={(text) => setNewMaterial({ ...newMaterial, cantidad: text })} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Precio por unidad" value={newMaterial.precio} onChangeText={(text) => setNewMaterial({ ...newMaterial, precio: text })} keyboardType="numeric"/>
            <TouchableOpacity style={styles.addButtonModal} onPress={handleAddMaterial}>
               <Ionicons name="add-circle" size={24} color="white" /> 
              <Text style={styles.addButtonModalText}>Guardar Material</Text> 
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAddMaterialModal(false)}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    
      <Modal visible={showEditPriceModal} transparent={true} animationType="fade" onRequestClose={() => setShowEditPriceModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.addMaterialModalContent}>
            <Text style={styles.modalTitle}>Editar Precio de Mano de Obra</Text>
            <TextInput style={styles.input} placeholder="Nuevo precio" value={newWorkPrice} onChangeText={setNewWorkPrice} keyboardType="numeric"/> 
            <TouchableOpacity style={styles.addButtonModal} onPress={handleUpdateWorkPrice}>
              <Ionicons name="save-outline" size={24} color="white" />
              <Text style={styles.addButtonModalText}>Guardar Precio</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowEditPriceModal(false)}>
               <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {showDatePicker && (<DateTimePicker value={newDate} mode="date" display="default" onChange={onDateChange} minimumDate={new Date()}/>)}
       {showTimePicker && <DateTimePicker value={newDate} mode="time" display="default" onChange={onTimeChange} />}
    
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.imageModalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalCloseButton}>
               <Ionicons name="close" size={30} color="white" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
               {selectedPhotoIndex + 1} de {photoUris.length}
            </Text>
          </View>
          <View style={styles.modalImageContainer}>
            {photoUris.length > 0 && (
              <Image source={{ uri: photoUris[selectedPhotoIndex] }} style={styles.modalImage} contentFit="contain" />
            )}
            {photoUris.length > 1 && (
              <>
                {selectedPhotoIndex > 0 && (
                  <TouchableOpacity style={[styles.navButton, styles.prevButton]} onPress={() => navigatePhoto("prev")}>
                     <Ionicons name="chevron-back" size={30} color="white" />
                  </TouchableOpacity>
                )}
                {selectedPhotoIndex < photoUris.length - 1 && (
                  <TouchableOpacity style={[styles.navButton, styles.nextButton]} onPress={() => navigatePhoto("next")}>
                    <Ionicons name="chevron-forward" size={30} color="white" />
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA", 
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2F4550", 
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingBottom: 20,
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
    marginRight: 40, 
  },
  detailsContainer: {
    flex: 1,
    backgroundColor: "#FFF", 
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25, 
    marginTop: -10,
  },
  detailItem: {
    backgroundColor: "#F5F7FA", 
    borderRadius: 12,
    padding: 16, 
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E1E5EA", 
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  estadoContainer: {
    flexDirection: "column",
    alignItems: "stretch",
  },
  estadoInfo: {
    marginBottom: 15,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  estadoBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 20,
  },
  estadoText: {
    fontSize: 18,
    fontWeight: "600", 
    color: "#2F4550", 
    alignItems: "left",
  },
  botonesContainer: {
    flexDirection: "column",
    gap: 12,
    maxWidth: 340,
  },
  estadoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    minHeight: 50,
  },
  estadoButtonSuccess: {
    backgroundColor: "#4CAF50",
    shadowColor: "#4CAF50",
  },
  estadoButtonDanger: {
    backgroundColor: "#F44336",
    shadowColor: "#F44336",
  },
  estadoButtonText: {
    color: "white",
    fontWeight: "600", 
    marginLeft: 8,
    fontSize: 16,
    textAlign: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "600", 
    color: "#2F4550", 
    marginBottom: 8,
    alignItems: "flex-start",
  },
  value: {
    fontSize: 16, 
    fontWeight: "400", 
    color: "#2F4550", 
    paddingLeft: 0, 
  },
  costosSection: {
    backgroundColor: "#F8F9FA", 
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: "#E1E5EA", 
  },
  costoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12, 
    paddingVertical: 4,
  },
  costoLabel: {
    fontSize: 16,
    color: "#2F4550", 
    flex: 1, 
  },
  costoValueMateriales: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2F4550",
    right: 50, 
  },
  costoValueManoObra: {
    fontSize: 16, 
    fontWeight: "600",
    color: "#2F4550", 
    right: 20, 
  },

  costoValue: {
    fontSize: 16, 
    fontWeight: "600",
    color: "#2F4550", 
    textAlign: "right", 
  },
  totalFinal: {
    borderTopWidth: 2,
    borderTopColor: "#2F4550",
    paddingTop: 12,
    marginTop: 8, 
    marginBottom: 0, 
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2F4550", 
    flex: 1, 
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2F4550", 
    textAlign: "right", 
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingHorizontal: 0, 
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2F4550",
    flex: 1, 
  },
  addButton: {
    backgroundColor: "#2F4550",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8, 
    paddingHorizontal: 16,
    borderRadius: 8, 
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    color: "#FFF",
    fontSize: 14, 
    fontWeight: "600",
    marginLeft: 6,
  },
  materialesSection: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E1E5EA",
  },
  materialQuantity: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
    left: 0, 
  },
  materialPrice: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
    left: -31, 
  },
  materialSubtotal: {
    fontSize: 14,
    color: "#555",
    fontWeight: "600",
    left: -31, 
  },
  materialItem: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#2F4550",
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  materialHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between", 
    marginBottom: 8,
  },
  materialNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2F4550",
    marginRight: 8,
    minWidth: 20,
  },
  materialDescription: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2F4550",
    flex: 1,
  },
  materialDetails: {
    marginLeft: 28,
    paddingTop: 4,
  },
  costosSection: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1, 
    borderColor: "#E1E5EA",
  },
  costoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12, 
    paddingVertical: 4, 
  },
  costoLabel: {
    fontSize: 16,
    color: "#2F4550",
    flex: 1, 
  },
  costoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2F4550",
    textAlign: "right", 
  },
  totalFinal: {
    borderTopWidth: 2,
    borderTopColor: "#2F4550",
    paddingTop: 12, 
    marginTop: 8, 
    marginBottom: 0, 
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2F4550",
    flex: 1, 
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2F4550",
    textAlign: "right",
  },
  editPriceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingVertical: 4, 
    paddingHorizontal: 8,
  },
  noMaterialsText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center", 
    fontStyle: "italic",
    paddingVertical: 20, 
  },
  phoneContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  phoneIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  phoneButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginLeft: 10,
  },
  editableContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  editableInput: {
    flex: 1,
    backgroundColor: "#F5F7FA",
    borderRadius: 12,
    padding: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E1E5EA",
  },
  saveButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: "transparent",
  },
  modalContainerReprogramar:{
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",

  },
  modalContentReprogramar:{
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 25,
    width: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    alignItems: "center",
  },
  modalTitleReprogramar:{
    marginBottom: 10,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
  },
  confirmButtonReprogramar:{
    backgroundColor: "#2F4550", 
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginBottom: 15,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmButtonTextReprogrmar:{
    color: "white",
    fontSize: 18,
    fontWeight: "600",  
    marginLeft: 10,
  },
  deleteButtonReprogramar:{
    backgroundColor: "red",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    marginBottom: 15,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  deleteButtonTextEliminar:{
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 10,
  },
  modalContainer: {
    flex: 1,
    top: 300,
    left: 22,
  },
  modalTitle: {
    marginBottom: 20,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
  },
  imageModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalCloseButton: {
    padding: 10,
  },
  modalImageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  modalImage: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height * 0.7,
  },
  navButton: {
    position: "absolute",
    top: "50%",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 25,
    padding: 15,
    marginTop: -25,
  },
  prevButton: {
    left: 20,
  },
  nextButton: {
    right: 20,
  },
  addMaterialModalContent: {
    backgroundColor: "#FFF", 
    borderRadius: 20,
    padding: 25, // Updated padding
    width: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  input: {
    width: "100%",
    backgroundColor: "#F5F7FA", 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 20, 
    fontSize: 16,
    color: "#2F4550",
    borderWidth: 1,
    borderColor: "#E1E5EA", 
  },
  addButtonModal: {
    backgroundColor: "#2F4550", 
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18, 
    paddingHorizontal: 30,
    borderRadius: 12,
    marginBottom: 15,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  addButtonModalText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 10,
  },
  phoneContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  phoneIcons: {
    flexDirection: "row",
    alignItems: "center",
  },
  phoneButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginLeft: 10,
  },
  noPhotosText: {
    textAlign: "center",
    color: "#888",
    fontStyle: "italic",
    marginTop: 10,
  },
})

export default WorkDetailScreen
