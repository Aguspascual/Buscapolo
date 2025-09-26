import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, SafeAreaView, View, Text, TouchableOpacity, Alert, FlatList, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isPast, isToday } from 'date-fns';
import { es } from 'date-fns/locale';

// Componente de calendario semanal
const WeeklyCalendarScreen = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [trabajos, setTrabajos] = useState({});
    const router = useRouter();

    const fetchTrabajos = async () => {
        try {
            const trabajosJSON = await AsyncStorage.getItem('trabajos');
            const trabajosArray = trabajosJSON ? JSON.parse(trabajosJSON) : [];
            
            const newTrabajos = {};
            const start = startOfWeek(currentDate, { locale: es });
            const end = endOfWeek(currentDate, { locale: es });
            const days = eachDayOfInterval({ start, end });

            days.forEach(day => {
                newTrabajos[format(day, 'yyyy-MM-dd')] = [];
            });

            trabajosArray.forEach(trabajo => {
                const trabajoDate = new Date(trabajo.fecha);
                const trabajoKey = format(trabajoDate, 'yyyy-MM-dd');

                if (newTrabajos[trabajoKey] && isSameDay(trabajoDate, new Date(trabajo.fecha))) {
                    newTrabajos[trabajoKey].push(trabajo);
                }
            });

            Object.keys(newTrabajos).forEach(day => {
                newTrabajos[day].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
            });

            setTrabajos(newTrabajos);

        } catch (error) {
            console.error('Error al cargar los trabajos:', error);
            Alert.alert('Error', 'No se pudieron cargar los trabajos del calendario.');
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchTrabajos();
        }, [currentDate])
    );

    const goToPreviousWeek = () => {
        const previousWeek = new Date(currentDate);
        previousWeek.setDate(currentDate.getDate() - 7);
        setCurrentDate(previousWeek);
    };

    const goToNextWeek = () => {
        const nextWeek = new Date(currentDate);
        nextWeek.setDate(currentDate.getDate() + 7);
        setCurrentDate(nextWeek);
    };

    const getTrabajoColor = (trabajo) => {
        const trabajoDate = new Date(trabajo.fecha);
        
        if (isPast(trabajoDate) && !isToday(trabajoDate)) {
            switch(trabajo.estadoPago) {
                case 'Pagado': return '#28A745'; 
                case 'Cancelado': return '#6C757D';
                default: return '#DC3545';
            }
        }
        
        switch(trabajo.estadoPago) {
            case 'Pagado': return '#28A745';
            case 'Cancelado': return '#6C757D'; 
            default: return '#FFC107'; 
        }
    };
    
    const getTrabajoIcon = (estado) => {
        switch (estado) {
            case "Pagado":
                return "checkmark-circle-outline";
            case "Cancelado":
                return "close-circle-outline";
            default:
                return "time-outline";
        }
    };

    const renderTrabajoItem = ({ item }) => {
        const estado = item.estadoPago || 'Pendiente';
        const backgroundColor = getTrabajoColor(item);
        const iconName = getTrabajoIcon(estado);
        
        return (
            <TouchableOpacity 
                style={[styles.trabajoItem, { borderLeftColor: backgroundColor }]} 
                onPress={() => {
                    router.push({
                        pathname: 'WorkDetailScreen',
                        params: { trabajo: JSON.stringify(item) }
                    });
                }}
            >
                <View style={styles.trabajoHeader}>
                    <View style={styles.trabajoMainInfo}>
                        <Ionicons name="briefcase-outline" size={20} color="#2F4550" />
                        <View style={styles.trabajoInfo}>
                            <Text style={styles.trabajoCliente}>{item.clienteNombre}</Text>
                            <Text style={styles.trabajoTipo}>{item.tipoTrabajo}</Text>
                        </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: backgroundColor }]}>
                        <Ionicons name={iconName} size={14} color="#fff" />
                        <Text style={styles.statusText}>{estado}</Text>
                    </View>
                </View>

                <Text style={styles.trabajoDescription} numberOfLines={2}>
                    {item.trabajo}
                </Text>

                <View style={styles.trabajoFooter}>
                    <Text style={styles.trabajoTime}>
                        <Ionicons name="time-outline" size={12} color="#6C757D" /> {format(new Date(item.fecha), 'HH:mm')}
                    </Text>
                    <Text style={styles.trabajoDate}>
                         <Ionicons name="calendar-outline" size={12} color="#6C757D" /> {new Date(item.fecha).toLocaleDateString()}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const start = startOfWeek(currentDate, { locale: es });
    const end = endOfWeek(currentDate, { locale: es });
    const daysInWeek = eachDayOfInterval({ start, end });
    const formattedDateRange = `${format(start, 'dd MMM', { locale: es })} - ${format(end, 'dd MMM', { locale: es })}`;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.replace('/')} style={styles.backButton}>
                    <Ionicons name="home-outline" size={28} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.title}>Calendario Semanal</Text>
            </View>

            <View style={styles.formContainer}>
                <View style={styles.weekSelector}>
                    <TouchableOpacity onPress={goToPreviousWeek}>
                        <Ionicons name="chevron-back-outline" size={30} color="#2F4550" />
                    </TouchableOpacity>
                    <Text style={styles.weekRange}>{formattedDateRange}</Text>
                    <TouchableOpacity onPress={goToNextWeek}>
                        <Ionicons name="chevron-forward-outline" size={30} color="#2F4550" />
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={daysInWeek}
                    keyExtractor={(item) => format(item, 'yyyy-MM-dd')}
                    renderItem={({ item: day }) => (
                        <View style={styles.dayCard}>
                            <View style={[styles.dayTitleContainer, isToday(day) && styles.todayTitleContainer]}>
                                <Text style={[styles.dayTitle, isToday(day) && styles.todayTitle]}>
                                    {format(day, 'EEEE d', { locale: es })}
                                </Text>
                            </View>
                            
                            {trabajos[format(day, 'yyyy-MM-dd')] && trabajos[format(day, 'yyyy-MM-dd')].length > 0 ? (
                                <FlatList
                                    data={trabajos[format(day, 'yyyy-MM-dd')]}
                                    keyExtractor={trabajo => trabajo.id}
                                    renderItem={renderTrabajoItem}
                                    style={styles.trabajosList}
                                />
                            ) : (
                                <Text style={styles.noTrabajosText}>No hay trabajos para este día.</Text>
                            )}
                        </View>
                    )}
                    style={styles.list}
                    showsVerticalScrollIndicator={false}
                />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8F9FA",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#2F4550",
        paddingHorizontal: 20,
        paddingVertical: 15,
        paddingTop: Platform.OS === "android" ? 50 : 15,
        paddingBottom: 40,
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
    formContainer: {
        flex: 1,
        backgroundColor: "#F8F9FA",
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: 20,
        marginTop: -20,
    },
    weekSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        backgroundColor: '#FFF',
        borderRadius: 12,
        marginTop: 20,
        paddingHorizontal: 20,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    weekRange: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2F4550',
        textTransform: 'capitalize',
    },
    dayCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginBottom: 15,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    dayTitleContainer: {
        borderBottomWidth: 1,
        borderBottomColor: '#E1E5EA',
        padding: 15,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    todayTitleContainer: {
        backgroundColor: '#E1E5EA',
    },
    dayTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#2F4550',
        textTransform: 'capitalize',
    },
    todayTitle: {
        color: '#2F4550',
    },
    trabajosList: {
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    trabajoItem: {
        backgroundColor: "#F8F9FA",
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
        borderLeftWidth: 4,
    },
    trabajoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    trabajoMainInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    trabajoInfo: {
        marginLeft: 12,
        flex: 1,
    },
    trabajoCliente: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    trabajoTipo: {
        fontSize: 14,
        color: '#6C757D',
        marginTop: 2,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
    trabajoDescription: {
        fontSize: 14,
        color: '#555',
        marginBottom: 12,
        lineHeight: 20,
    },
    trabajoFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    trabajoTime: {
        fontSize: 12,
        color: '#6C757D',
    },
    trabajoDate: {
        fontSize: 12,
        color: '#6C757D',
    },
    noTrabajosText: {
        textAlign: 'center',
        color: '#999',
        paddingVertical: 20,
    },
    list: {
        flex: 1,
    },
});

export default WeeklyCalendarScreen;