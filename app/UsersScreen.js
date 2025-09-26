"use client"

import { useState, useEffect, useCallback } from "react"
import { StyleSheet, SafeAreaView, View, Text, TextInput, TouchableOpacity, FlatList, Alert, Modal } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useRouter, useFocusEffect } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import * as Contacts from "expo-contacts"

const UsersScreen = () => {
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [searchText, setSearchText] = useState("")
  const [contacts, setContacts] = useState([])
  const [showContactsModal, setShowContactsModal] = useState(false)
  const [filteredContacts, setFilteredContacts] = useState([])
  const [contactSearchText, setContactSearchText] = useState("")

  const router = useRouter()

  const fetchUsers = async () => {
    try {
      const usersJSON = await AsyncStorage.getItem("clientes")
      const usersArray = usersJSON ? JSON.parse(usersJSON) : []
      setUsers(usersArray)
      setFilteredUsers(usersArray)
    } catch (error) {
      console.error("Error al cargar los usuarios:", error)
      Alert.alert("Error", "No se pudieron cargar los usuarios.")
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchUsers()
    }, []),
  )

  useEffect(() => {
    if (searchText === "") {
      setFilteredUsers(users)
    } else {
      const filtered = users.filter(
        (user) =>
          user.nombre.toLowerCase().includes(searchText.toLowerCase()) ||
          user.apellido.toLowerCase().includes(searchText.toLowerCase()),
      )
      setFilteredUsers(filtered)
    }
  }, [searchText, users])

  useEffect(() => {
    if (contactSearchText === "") {
      setFilteredContacts(contacts)
    } else {
      const filtered = contacts.filter(
        (contact) =>
          contact.name.toLowerCase().includes(contactSearchText.toLowerCase()) ||
          (contact.phoneNumbers && contact.phoneNumbers.some((phone) => phone.number.includes(contactSearchText))),
      )
      setFilteredContacts(filtered)
    }
  }, [contactSearchText, contacts])

  const importContacts = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync()
      if (status === "granted") {
        const { data } = await Contacts.getContactsAsync({
          fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
        })

        if (data.length > 0) {
          const validContacts = data.filter(
            (contact) => contact.name && contact.phoneNumbers && contact.phoneNumbers.length > 0,
          )
          setContacts(validContacts)
          setFilteredContacts(validContacts)
          setShowContactsModal(true)
        } else {
          Alert.alert("Sin contactos", "No se encontraron contactos en el dispositivo.")
        }
      } else {
        Alert.alert("Permisos denegados", "Se necesitan permisos para acceder a los contactos.")
      }
    } catch (error) {
      console.error("Error al importar contactos:", error)
      Alert.alert("Error", "No se pudieron importar los contactos.")
    }
  }

  const selectContact = (contact) => {
    const fullName = contact.name || contact.displayName || ""
    const nameParts = fullName.split(" ")
    const firstName = nameParts[0] || ""
    const lastName = nameParts.slice(1).join(" ") || ""

    let phoneNumber = ""
    if (contact.phoneNumbers && contact.phoneNumbers.length > 0) {
      phoneNumber = contact.phoneNumbers[0].number || ""
      phoneNumber = phoneNumber.replace(/[\s\-\(\)]/g, "")
      if (!phoneNumber.startsWith("+54") && !phoneNumber.startsWith("+")) {
        phoneNumber = "+54" + phoneNumber
      }
    }

    router.push({
      pathname: "/NewClientScreen",
      params: {
        fromContact: "true",
        nombre: firstName,
        apellido: lastName,
        telefono: phoneNumber,
      },
    })
  }

  const deleteUser = async (userId) => {
    try {
      const usersJSON = await AsyncStorage.getItem("clientes")
      const usersArray = usersJSON ? JSON.parse(usersJSON) : []

      const updatedUsers = usersArray.filter((user) => user.id !== userId)

      await AsyncStorage.setItem("clientes", JSON.stringify(updatedUsers))
      setUsers(updatedUsers)
      setFilteredUsers(updatedUsers)

      Alert.alert("Eliminado", "El cliente ha sido eliminado correctamente.")
    } catch (error) {
      console.error("Error al eliminar el cliente:", error)
      Alert.alert("Error", "No se pudo eliminar el cliente.")
    }
  }

  const confirmDelete = (user) => {
    Alert.alert(
      "Confirmar Eliminación",
      `¿Estás seguro de que quieres eliminar a ${user.nombre} ${user.apellido}?`,
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Eliminar",
          onPress: () => deleteUser(user.id),
          style: "destructive",
        },
      ],
    )
  }

  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => {
        router.push({
          pathname: "ClientDetailScreen",
          params: { cliente: JSON.stringify(item) },
        })
      }}
    >
      <Ionicons name="person-circle-outline" size={30} color="#003366" />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>
          {item.nombre} {item.apellido}
        </Text>
        <Text style={styles.userPhone}>{item.telefono}</Text>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => confirmDelete(item)}
      >
        <Ionicons name="trash-outline" size={24} color="#f44336" />
      </TouchableOpacity>
    </TouchableOpacity>
  )

  const renderContactItem = ({ item }) => (
    <TouchableOpacity style={styles.contactItem} onPress={() => selectContact(item)}>
      <Ionicons name="person-outline" size={24} color="#003366" />
      <View style={styles.contactInfo}>
        <Text style={styles.contactName}>{item.name}</Text>
        <Text style={styles.contactPhone}>{item.phoneNumbers[0]?.number || "Sin teléfono"}</Text>
      </View>
      <Ionicons name="add-circle-outline" size={20} color="#2196F3" />
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/")} style={styles.backButton}>
          <Ionicons name="home-outline" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Usuarios</Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#003366" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Buscar por nombre o apellido"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity style={styles.newUserButton} onPress={() => router.push("NewClientScreen")}>
            <Ionicons name="add-circle-outline" size={24} color="#fff" />
            <Text style={styles.newUserButtonText}>Nuevo Usuario</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.importContactsButton} onPress={importContacts}>
            <Ionicons name="phone-portrait-outline" size={24} color="#fff" />
            <Text style={styles.importContactsButtonText}>Importar Contactos</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderUserItem}
          ListEmptyComponent={() => <Text style={styles.emptyListText}>No hay usuarios registrados.</Text>}
          style={styles.list}
        />
      </View>

      <Modal visible={showContactsModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowContactsModal(false)} style={styles.closeButton}>
              <Ionicons name="close-outline" size={28} color="#003366" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Seleccionar Contacto</Text>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={20} color="#003366" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                value={contactSearchText}
                onChangeText={setContactSearchText}
                placeholder="Buscar contacto"
                placeholderTextColor="#999"
              />
            </View>

            <FlatList
              data={filteredContacts}
              keyExtractor={(item) => item.id}
              renderItem={renderContactItem}
              ListEmptyComponent={() => <Text style={styles.emptyListText}>No se encontraron contactos.</Text>}
              style={styles.contactsList}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2F4550",
    paddingTop: 10,
  },
  header: {
    padding: 40,
    backgroundColor: "#2F4550",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  backButton: {
    position: "absolute",
    left: 30,
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
    padding: 20,
    paddingTop: 30,
    marginTop: -20,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 15,
    fontSize: 16,
    color: "#333",
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 10,
  },
  newUserButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2196F3",
    padding: 18,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  newUserButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  importContactsButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4CAF50",
    padding: 18,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  importContactsButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  list: {
    flex: 1,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    justifyContent: "space-between",
  },
  userInfo: {
    flex: 1,
    marginLeft: 15,
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  userPhone: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    marginLeft: 10,
  },
  emptyListText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
    color: "#999",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFEB3B",
  },
  modalHeader: {
    padding: 20,
    backgroundColor: "#FFEB3B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    left: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#003366",
  },
  modalContent: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    paddingTop: 30,
    marginTop: -20,
  },
  contactsList: {
    flex: 1,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  contactInfo: {
    flex: 1,
    marginLeft: 15,
  },
  contactName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  contactPhone: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
})

export default UsersScreen