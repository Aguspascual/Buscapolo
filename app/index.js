import { useEffect, useState } from "react"
import { StyleSheet, View, Text, TouchableOpacity, Platform, Alert, ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import * as Notifications from "expo-notifications"
import AsyncStorage from "@react-native-async-storage/async-storage"
import * as Sharing from "expo-sharing"
import * as DocumentPicker from "expo-document-picker"
import * as FileSystem from "expo-file-system"

// Configuración del manejador de notificaciones para que las notificaciones se muestran en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

// Función para solicitar permisos de notificación en el dispositivo
const registerForPushNotificationsAsync = async () => {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    })
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }
  if (finalStatus !== "granted") {
    console.error("Error al obtener el permiso de notificaciones!")
    return
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data
  return token
}

// Función para programar la notificación diaria
const scheduleDailyReminder = async () => {
  try {
    const lastScheduledDate = await AsyncStorage.getItem("lastDailyNotificationScheduled")
    const today = new Date().toDateString()

    if (lastScheduledDate === today) {
      console.log("Notificación diaria ya programada para hoy.")
      return
    }

    // Cancelar solo la notificación diaria anterior 
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync()
    const dailyNotifications = scheduledNotifications.filter(
      (notification) => notification.content.title === "Recordatorio de Trabajos 🗓️",
    )

    for (const notification of dailyNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier)
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Recordatorio de Trabajos 🗓️",
        body: "¡No olvides revisar los trabajos programados para mañana!",
      },
      trigger: {
        hour: 22,
        minute: 0,
        repeats: true,
      },
    })

    await AsyncStorage.setItem("lastDailyNotificationScheduled", today)
    console.log("Notificación diaria programada para las 22:00 horas.")
  } catch (error) {
    console.error("Error al programar notificación diaria:", error)
  }
}

const scheduleWorkNotifications = async () => {
  try {
    // Cancelar notificaciones existentes de trabajos 
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync()
    const workNotifications = scheduledNotifications.filter((notification) =>
      notification.identifier.startsWith("work_"),
    )

    for (const notification of workNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier)
    }

    // Obtener trabajos desde AsyncStorage
    const worksData = await AsyncStorage.getItem("works")
    if (!worksData) return

    const works = JSON.parse(worksData)
    const now = new Date()

    // Programar notificación para cada trabajo futuro
    for (const work of works) {
      if (work.estado === "Cancelado") continue 

      const workDateTime = new Date(`${work.fecha}T${work.hora}`)
      const notificationTime = new Date(workDateTime.getTime() - 60 * 60 * 1000) 

      // Solo programar si la notificación es en el futuro
      if (notificationTime > now) {
        await Notifications.scheduleNotificationAsync({
          identifier: `work_${work.id}`,
          content: {
            title: "⏰ Trabajo próximo",
            body: `En 1 hora: ${work.descripcion} - Cliente: ${work.cliente}`,
            data: { workId: work.id, type: "work_reminder" },
          },
          trigger: notificationTime,
        })

        console.log(`Notificación programada para trabajo ${work.id} a las ${notificationTime.toLocaleString()}`)
      }
    }
  } catch (error) {
    console.error("Error al programar notificaciones de trabajos:", error)
  }
}

const index = () => {
  const router = useRouter()
  const [showOptionsMenu, setShowOptionsMenu] = useState(false)
  useEffect(() => {
    const initializeNotifications = async () => {
      await registerForPushNotificationsAsync()
      await scheduleDailyReminder()
      await scheduleWorkNotifications()
    }

    initializeNotifications()

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const { data } = response.notification.request.content

      if (data?.type === "work_reminder" && data?.workId) {
        router.push(`/WorkDetailScreen?workId=${data.workId}`)
      }
    })

    const appStateSubscription = Notifications.addNotificationReceivedListener(() => {
      scheduleWorkNotifications()
    })

    return () => {
      subscription.remove()
      appStateSubscription.remove()
    }
  }, [])

  const refreshNotifications = async () => {
    await scheduleWorkNotifications()
  }

  // Función para exportar los datos de AsyncStorage a un archivo .json
  const handleExportData = async () => {
    setShowOptionsMenu(false)
    try {
      const allKeys = await AsyncStorage.getAllKeys()
      const items = await AsyncStorage.multiGet(allKeys)
      const dataToExport = Object.fromEntries(items)
      const dataString = JSON.stringify(dataToExport)

      const fileUri = `${FileSystem.documentDirectory}buscapolo_backup.json`
      await FileSystem.writeAsStringAsync(fileUri, dataString)

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Error", "Compartir no está disponible en este dispositivo.")
        return
      }

      await Sharing.shareAsync(fileUri, { dialogTitle: "Exportar Backup Buscapolo" })
      Alert.alert("Éxito", "Backup exportado correctamente.")
    } catch (error) {
      console.error("Error al exportar los datos:", error)
      Alert.alert("Error", "No se pudieron exportar los datos.")
    }
  }

  const handleImportData = async () => {
    setShowOptionsMenu(false)
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
      })

      if (!result.canceled && result.assets[0].uri) {
        const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri)
        const importedData = JSON.parse(fileContent)

        // Limpiar el almacenamiento actual antes de restaurar
        await AsyncStorage.clear()

        // Restaurar los datos del archivo
        const itemsToRestore = Object.entries(importedData)
        await AsyncStorage.multiSet(itemsToRestore)

        await refreshNotifications()

        Alert.alert("Éxito", "Datos restaurados correctamente. Las notificaciones han sido actualizadas.")
      }
    } catch (error) {
      console.error("Error al importar los datos:", error)
      Alert.alert("Error", "No se pudieron importar los datos.")
    }
  }

  const handleImportDataOld = async () => {
    setShowOptionsMenu(false) 
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
      })

      if (!result.canceled && result.assets[0].uri) {
        const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri)
        const importedData = JSON.parse(fileContent)
        await AsyncStorage.clear()

        // Restaurar los datos del archivo
        const itemsToRestore = Object.entries(importedData)
        await AsyncStorage.multiSet(itemsToRestore)

        Alert.alert("Éxito", "Datos restaurados correctamente. Reinicia la aplicación para ver los cambios.")
      }
    } catch (error) {
      console.error("Error al importar los datos:", error)
      Alert.alert("Error", "No se pudieron importar los datos.")
    }
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>BUSCAPOLO</Text>
          <TouchableOpacity 
            style={styles.optionsButton} 
            onPress={() => setShowOptionsMenu(!showOptionsMenu)}
          >
            <Ionicons name="cog" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Menú de opciones desplegable */}
        {showOptionsMenu && (
          <View style={styles.optionsMenu}>
            <TouchableOpacity style={styles.optionButton} onPress={handleExportData}>
              <Ionicons name="save-outline" size={22} color="#2F4550" />
              <Text style={styles.optionButtonText}>Exportar Backup</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionButton} onPress={handleImportData}>
              <Ionicons name="cloud-upload-outline" size={22} color="#2F4550" />
              <Text style={styles.optionButtonText}>Importar Backup</Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <View style={styles.buttonGrid}>
              <TouchableOpacity style={styles.button} onPress={() => router.push("NewWorkScreen")}>
                <View style={styles.buttonIconContainer}>
                  <Ionicons name="add-circle" size={32} color="#FFF" />
                </View>
                <Text style={styles.buttonText}>Nuevo Trabajo</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.button} onPress={() => router.push("NewBudgetScreen")}>
                <View style={styles.buttonIconContainer}>
                  <Ionicons name="document-text" size={32} color="#FFF" />
                </View>
                <Text style={styles.buttonText}>Nuevo Presupuesto</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.button} onPress={() => router.push("WeeklyCalendarScreen")}>
                <View style={styles.buttonIconContainer}>
                  <Ionicons name="calendar" size={32} color="#FFF" />
                </View>
                <Text style={styles.buttonText}>Calendario</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.button} onPress={() => router.push("BudgetsScreen")}>
                <View style={styles.buttonIconContainer}>
                  <Ionicons name="folder" size={32} color="#FFF" />
                </View>
                <Text style={styles.buttonText}>Presupuestos</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.button} onPress={() => router.push("NewClientScreen")}>
                <View style={styles.buttonIconContainer}>
                  <Ionicons name="person-add" size={32} color="#FFF" />
                </View>
                <Text style={styles.buttonText}>Nuevo Cliente</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.button} onPress={() => router.push("UsersScreen")}>
                <View style={styles.buttonIconContainer}>
                  <Ionicons name="people" size={32} color="#FFF" />
                </View>
                <Text style={styles.buttonText}>Usuarios</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.button} onPress={() => router.push("MonthlySummaryScreen")}>
                <View style={styles.buttonIconContainer}>
                  <Ionicons name="bar-chart" size={32} color="#FFF" />
                </View>
                <Text style={styles.buttonText}>Dashboard</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  safeArea: {
    flex: 1,
  },
  header: {
    width: "90%",
    marginLeft: "5%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#2F4550",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 1,
  },
  optionsButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  optionsMenu: {
    position: "absolute",
    top: 120,
    right: 20,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 2,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  optionButtonText: {
    fontSize: 16,
    color: "#2F4550",
    marginLeft: 12,
    fontWeight: "500",
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 25,
  },
  buttonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 16,
  },
  button: {
    width: "47%",
    backgroundColor: "#2F4550",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 16,
  },
  buttonIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
})

export default index