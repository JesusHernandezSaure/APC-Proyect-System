import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue, get } from "firebase/database";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { 
  LayoutDashboard, 
  Briefcase, 
  Search, 
  CheckCircle2, 
  Clock, 
  Layers, 
  ShieldCheck, 
  Plus, 
  ArrowRight, 
  X, 
  MessageSquare, 
  Send, 
  FileBarChart, 
  Wallet, 
  History,
  ShieldAlert, 
  Inbox,
  CheckSquare, 
  ClipboardCheck,
  Trash2,
  ExternalLink,
  Link as LinkIcon,
  UserCheck,
  Lock,
  LogOut,
  Download,
  AlertTriangle,
  Users as UsersIcon,
  UserPlus,
  Paperclip,
  Cloud,
  CloudOff,
  RefreshCw,
  UploadCloud,
  SearchCheck,
  DollarSign,
  Power,
  Ban,
  PieChart,
  Calendar,
  MapPin,
  Bell,
  UserCog
} from 'lucide-react';

// --- ☁️ CONFIGURACIÓN DE NUBE (FIREBASE) ---
const FIREBASE_CONFIG: any = {
  apiKey: "AIzaSyBBXtJzCyfC9ntnDGgtT67_havmTeP0BKI",
  authDomain: "apc-odt-system.firebaseapp.com",
  // Esta URL es necesaria para la base de datos en tiempo real
  databaseURL: "https://apc-odt-system-default-rtdb.firebaseio.com",
  projectId: "apc-odt-system",
  storageBucket: "apc-odt-system.firebasestorage.app",
  messagingSenderId: "50522458460",
  appId: "1:50522458460:web:152cc84f4495765c61d999",
  measurementId: "G-MCKFVRLRJ3"
};

// --- Inicialización Condicional de Firebase ---
let db: any = null;
let isCloudEnabled = false;

try {
  if (FIREBASE_CONFIG.apiKey) {
    const app = initializeApp(FIREBASE_CONFIG);
    db = getDatabase(app);
    isCloudEnabled = true;
    console.log("☁️ Sistema conectado a la nube APC Enterprise");
  } else {
    console.log("💾 Sistema operando en modo local (LocalStorage)");
  }
} catch (e) {
  console.error("Error conectando a Firebase:", e);
}

// --- Configuración de Colores Corporativos APC Publicidad ---
const COLORS = {
  pink: '#ec4899',   // Magenta corporativo (Rombo) - ALARMAS
  teal: '#0d9488',   // Verde/Teal corporativo (Coma/Rectángulo) - ÉXITO
  dark: '#334155',   // Gris Pizarra (Texto Logotipo)
  bg: '#f8fafc',
  white: '#ffffff',
  text: '#334155',
  border: '#e2e8f0',
  success: '#0d9488', 
  warning: '#f59e0b',
  danger: '#be185d',  
  info: '#3b82f6'
};

// --- Tipos de Datos (ISO 9001:2015) ---
type UserRole = 
  | 'Admin' 
  | 'Cuentas' 
  | 'Creativos' 
  | 'Médicos' 
  | 'Diseño' 
  | 'Tráfico' 
  | 'Audio y Video' 
  | 'Digital' 
  | 'Corrección' 
  | 'Cuentas (Cierre)' 
  | 'Administración'
  | 'Medical MKT'
  | 'Medical Content'
  | 'Innovación';

interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  isLeader: boolean;
  password?: string;
}

interface Assignment {
  area: string;
  assignedToName?: string; // Nombre del usuario
  assignedToId?: string;   // ID del usuario
  assignedAt?: string;
}

interface ProjectComment {
  id: string;
  user: string;
  role: string;
  text: string;
  timestamp: string;
}

interface ProjectLink {
  id: string;
  user: string;
  url: string;
  description: string;
  timestamp: string;
}

interface TrackingLog {
  area: string;
  start: string; // ISO Date String
  end?: string;  // ISO Date String
}

interface Project {
  id: string;
  empresa: string;
  marca: string;
  producto: string;
  tipo: string;
  sub_tipo?: string; 
  materiales: string; 
  etapa_actual: string;
  status: 'Normal' | 'Urgente' | 'Vencido' | 'Cancelado' | 'Finalizado';
  motivo_cancelacion?: string;
  fecha_inicio: string;
  fecha_entrega_final: string;
  fecha_entrega_real?: string;
  costo_estimado: number;
  se_factura: boolean; 
  justificacion_no_factura?: string; 
  pagado: boolean;
  correccion_ok: boolean;
  correccion_notas: string;
  comentarios: ProjectComment[];
  enlaces: ProjectLink[];
  historial: any[];
  areas_seleccionadas: string[];
  asignaciones: Assignment[];
  tracking: TrackingLog[]; // Auditoría ISO
}

const STORAGE_KEY = 'apc_pro_v11_master';
const USERS_STORAGE_KEY = 'apc_users_v11';

const INITIAL_USERS: User[] = [
  { id: '1', username: 'admin', name: 'Admin General', role: 'Admin', isLeader: true, password: 'admin' },
  { id: '2', username: 'cuentas.lider', name: 'Ana Lopez', role: 'Cuentas', isLeader: true, password: '123' },
  { id: '3', username: 'diseno.lider', name: 'Pedro Marmol', role: 'Diseño', isLeader: true, password: '123' },
  { id: '4', username: 'diseno.op', name: 'Juan Perez', role: 'Diseño', isLeader: false, password: '123' },
  { id: '5', username: 'qa.lider', name: 'Marta Ruiz', role: 'Corrección', isLeader: true, password: '123' },
];

// --- FUNCIONES AUXILIARES SLA ---
const checkSLA = (project: Project): { alert: boolean, type: 'QA' | 'General' | 'None', hours: number } => {
    if (['Finalizado', 'Cancelado'].includes(project.status)) return { alert: false, type: 'None', hours: 0 };

    const lastTrack = project.tracking[project.tracking.length - 1];
    if (!lastTrack) return { alert: false, type: 'None', hours: 0 };

    const diff = new Date().getTime() - new Date(lastTrack.start).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    // Regla QA: > 24 horas en Corrección
    if (project.etapa_actual === 'Corrección' && hours > 24) {
        return { alert: true, type: 'QA', hours };
    }

    // Regla General: > 72 horas (3 días) en cualquier área
    if (hours > 72) {
        return { alert: true, type: 'General', hours };
    }

    return { alert: false, type: 'None', hours };
};

export default function App() {
  // --- Estados ---
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(USERS_STORAGE_KEY);
    return saved ? (JSON.parse(saved) || []) : INITIAL_USERS;
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) || []) : [];
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('apc_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [view, setView] = useState<'dashboard' | 'proyectos' | 'correccion' | 'historico' | 'reportes' | 'usuarios'>('dashboard');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  
  // Reactivation States
  const [isReactivationModalOpen, setIsReactivationModalOpen] = useState(false);
  const [reactivationData, setReactivationData] = useState({ stage: '', newDate: '' });
  const reactivationBriefRef = useRef<HTMLDivElement>(null);
  
  // Cancel States
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');

  // New ODT Form States
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [formType, setFormType] = useState<string>('');
  const [formSubType, setFormSubType] = useState<string>('');
  const [isBilling, setIsBilling] = useState<boolean>(true);
  const briefRef = useRef<HTMLDivElement>(null);

  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [dbError, setDbError] = useState<string | null>(null);
  
  // Filters
  const [filterDate, setFilterDate] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [searchTerm, setSearchTerm] = useState('');

  // Inputs de detalle
  const [newComment, setNewComment] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkDesc, setNewLinkDesc] = useState('');

  // --- Listas de Configuración ---
  const productionAreas = [
    'Creativos', 
    'Medical MKT', 
    'Medical Content', 
    'Corrección', 
    'Diseño', 
    'Tráfico', 
    'Digital', 
    'Audio y Video', 
    'Innovación', 
    'Administración'
  ];

  const typeOptions: Record<string, string[]> = {
    'DIGITAL': ['Mailing', 'Approved email Veeva', 'AV Veeva', 'AV IQVIA', 'AV (otra plataforma)', 'Video 1920x1080', 'Video 1080x1920 (vertical)', 'Posteo', 'GIF', 'Otro'],
    'IMPRESO': ['AV', 'Folleto', 'Brochure', 'Díptico', 'Tríptico', 'Tarjetón', 'Roll up', 'Tent card', 'Otro'],
    'EVENTO': [],
    'PARRILLA RRSS': []
  };

  // --- Sincronización (Local vs Cloud) ---
  const syncProjects = (newData: Project[]) => {
    if (isCloudEnabled && db) {
      set(ref(db, 'projects'), newData).catch(err => setDbError(err.message));
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    }
    setProjects(newData); // Optimistic update
  };

  const syncUsers = (newData: User[]) => {
    if (isCloudEnabled && db) {
      set(ref(db, 'users'), newData).then(() => {
         alert("✅ Usuarios sincronizados con la nube correctamente.");
      }).catch(err => {
         alert("❌ Error al sincronizar: " + err.message);
         setDbError(err.message);
      });
    } else {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(newData));
    }
    setUsers(newData);
  };

  // --- Helper de Asignación Automática ---
  const findLeaderForArea = (area: string): User | undefined => {
      return users.find(u => u.role === area && u.isLeader);
  };

  // Función de rescate: Forzar subida de datos locales a la nube
  const forcePushToCloud = () => {
    if (!isCloudEnabled || !db) return alert("No hay conexión a la nube.");
    if (!window.confirm("⚠️ ATENCIÓN: Esto sobrescribirá los datos de la nube con los datos de TU computadora actual. ¿Continuar?")) return;
    
    set(ref(db, 'users'), users);
    set(ref(db, 'projects'), projects);
    alert("🚀 Datos forzados a la nube. Ahora otras computadoras deberían ver esta información al recargar.");
  };

  // Función de Purgado de Base de Datos
  const handlePurgeDatabase = () => {
    const confirmation = prompt("⚠️ PELIGRO CRÍTICO ⚠️\n\nEstás a punto de eliminar TODAS las ODTs del sistema.\nPara confirmar, escribe: ELIMINAR");
    if (confirmation === "ELIMINAR") {
      syncProjects([]);
      alert("🗑️ Sistema formateado. Todas las ODTs han sido eliminadas.");
    } else {
      alert("Acción cancelada. El texto no coincide.");
    }
  };

  // Función de verificación de integridad
  const verifyCloudData = async () => {
    if (!isCloudEnabled || !db) return alert("Modo Offline");
    try {
      const snapshot = await get(ref(db, 'users'));
      const cloudData = snapshot.val() || [];
      const cloudCount = Array.isArray(cloudData) ? cloudData.length : 0;
      const localCount = users.length;
      
      alert(
        `📊 REPORTE DE ESTADO:\n\n` +
        `☁️ Usuarios en la Nube: ${cloudCount}\n` +
        `💻 Usuarios Locales: ${localCount}\n\n` +
        (cloudCount === localCount ? "✅ Todo sincronizado correctamente." : "⚠️ Hay diferencias. Usa 'Forzar Subida' si tus datos locales son los correctos.")
      );
    } catch (error: any) {
      alert("Error al consultar la nube: " + error.message);
    }
  };

  // --- Función de Exportación CSV con Métricas Operativas ---
  const handleExportCSV = () => {
    const allAreas = productionAreas; // Usar la nueva lista

    // Encabezados Base
    const baseHeaders = [
      "ID", "Empresa", "Marca", "Producto", "Tipo", "Subtipo", "Status", 
      "Fecha Inicio", "Fecha Entrega", "Costo (MXN)", "Pagado"
    ];

    // Encabezados Dinámicos por Área (Entrada, Salida, Días)
    const areaHeaders: string[] = [];
    allAreas.forEach(area => {
       areaHeaders.push(`${area} (Entrada)`);
       areaHeaders.push(`${area} (Salida)`);
       areaHeaders.push(`${area} (Días)`);
    });

    const headers = [...baseHeaders, ...areaHeaders];
    
    const rows = (projects || []).map(p => {
      // Base Row Data
      const baseData = [
        p.id,
        `"${p.empresa}"`,
        `"${p.marca}"`,
        `"${p.producto}"`,
        p.tipo,
        p.sub_tipo || '-',
        p.status,
        p.fecha_inicio,
        p.fecha_entrega_final,
        p.costo_estimado || 0,
        p.pagado ? "SI" : "NO"
      ];

      // Area Time Data logic
      const areaData = allAreas.map(area => {
         // Buscar registros de esta área en el tracking
         const tracks = (p.tracking || []).filter(t => t.area === area);
         
         if (tracks.length === 0) {
            return ["-", "-", "0"]; // No pasó por esta área
         }

         // Tomamos la primera entrada y la última salida
         const firstEntry = tracks[0].start;
         // Calcular días totales acumulados en esta área
         let totalMs = 0;
         tracks.forEach(t => {
            const start = new Date(t.start).getTime();
            const end = t.end ? new Date(t.end).getTime() : new Date().getTime();
            totalMs += (end - start);
         });

         const days = (totalMs / (1000 * 60 * 60 * 24)).toFixed(2);
         const fmtDate = (iso: string | undefined) => iso ? iso.replace('T', ' ').substring(0, 16) : '-';

         return [fmtDate(firstEntry), fmtDate(tracks[tracks.length - 1].end), days.replace('.', ',')];
      });

      const flatAreaData = areaData.flat();
      return [...baseData, ...flatAreaData];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `APC_Reporte_Operativo_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Listeners de Firebase ---
  useEffect(() => {
    if (isCloudEnabled && db) {
      const unsubProjects = onValue(ref(db, 'projects'), (snapshot) => {
        const data = snapshot.val();
        const safeData = data ? (Array.isArray(data) ? data : Object.values(data)) : [];
        setProjects(safeData as Project[]);
      }, (error) => setDbError(error.message));

      const unsubUsers = onValue(ref(db, 'users'), (snapshot) => {
        const data = snapshot.val();
        const safeData = data ? (Array.isArray(data) ? data : Object.values(data)) : [];
        setUsers(safeData as User[]);
      }, (error) => setDbError(error.message));

      return () => {
        unsubProjects();
        unsubUsers();
      };
    }
  }, []);

  // --- Persistencia Local (Fallback) ---
  useEffect(() => {
    if (!isCloudEnabled) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    }
  }, [projects]);

  useEffect(() => {
    if (!isCloudEnabled) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    }
  }, [users]);


  // --- Sistema de Autenticación ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const inputUser = loginForm.username.trim();
    const inputPass = loginForm.password.trim();

    const user = (users || []).find(u => u.username === inputUser && u.password === inputPass);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('apc_session', JSON.stringify(user));
    } else {
      alert("Acceso denegado. Verifica usuario y contraseña.");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('apc_session');
    setView('dashboard');
  };

  // --- Gestión de Usuarios (ADMIN) ---
  const handleCreateUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const newUser: User = {
      id: Date.now().toString(),
      username: f.get('username') as string,
      name: f.get('name') as string,
      role: f.get('role') as UserRole,
      isLeader: f.get('isLeader') === 'on',
      password: (f.get('password') as string) || '123'
    };

    if (users.find(u => u.username === newUser.username)) return alert("El nombre de usuario ya existe.");
    syncUsers([...users, newUser]);
    setIsUserModalOpen(false);
  };

  const deleteUser = (id: string) => {
    if (id === currentUser?.id) return alert("No puedes eliminar tu propio usuario.");
    if (window.confirm("¿Seguro que deseas eliminar este usuario?")) {
      syncUsers(users.filter(u => u.id !== id));
    }
  };

  // --- Gestión de Proyectos ---
  const getProjectFlow = (p: Project) => [
    'Cuentas', ...(p.areas_seleccionadas || []), 'Corrección', 'Cuentas (Cierre)', 'Administración'
  ];

  const handleCreateODT = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedAreas.length === 0) return alert("Selecciona al menos una área participante.");
    
    // Validar brief rich text
    const briefContent = briefRef.current?.innerHTML;
    if (!briefContent || briefContent === '<br>') return alert("El brief de materiales no puede estar vacío.");

    const formData = new FormData(e.currentTarget);
    
    // Iniciar el tracking para el área inicial (Cuentas)
    const initialTracking: TrackingLog[] = [
      { area: 'Cuentas', start: new Date().toISOString() }
    ];

    // ASIGNACIÓN AUTOMÁTICA AL LÍDER DE CUENTAS
    const cuentasLeader = findLeaderForArea('Cuentas');
    const initialAssignments: Assignment[] = cuentasLeader 
        ? [{ area: 'Cuentas', assignedToId: cuentasLeader.id, assignedToName: cuentasLeader.name, assignedAt: new Date().toISOString() }]
        : [];

    const newODT: Project = {
      id: formData.get('id_odt') as string, // ID Manual como solicitado
      empresa: formData.get('empresa') as string,
      marca: formData.get('marca') as string,
      producto: formData.get('producto') as string,
      tipo: formType,
      sub_tipo: formSubType,
      materiales: briefContent, // Contenido HTML enriquecido
      etapa_actual: 'Cuentas',
      status: 'Normal',
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_entrega_final: formData.get('fecha') as string,
      // Lógica de Costo vs Justificación
      costo_estimado: isBilling ? (parseInt(formData.get('costo') as string) || 0) : 0,
      se_factura: isBilling,
      justificacion_no_factura: !isBilling ? (formData.get('justificacion') as string) : undefined,
      
      pagado: false,
      correccion_ok: false,
      correccion_notas: '',
      comentarios: [],
      enlaces: [],
      areas_seleccionadas: selectedAreas,
      asignaciones: initialAssignments,
      historial: [{ action: "ODT Creada", user: currentUser?.name, timestamp: new Date().toLocaleString() }],
      tracking: initialTracking 
    };

    syncProjects([newODT, ...(projects || [])]);
    setIsModalOpen(false);
    setSelectedAreas([]);
    setFormType('');
    setFormSubType('');
    setView('proyectos');
  };

  const handleAddComment = () => {
    if (!selectedProject || !newComment.trim()) return;
    const comment: ProjectComment = {
      id: Date.now().toString(),
      user: currentUser?.name || '',
      role: currentUser?.role || '',
      text: newComment,
      timestamp: new Date().toLocaleString()
    };
    syncProjects(projects.map(p => p.id === selectedProject.id ? { ...p, comentarios: [comment, ...(p.comentarios || [])] } : p));
    setNewComment('');
  };

  const handleAddLink = () => {
    if (!selectedProject || !newLinkUrl.trim()) return;
    const link: ProjectLink = {
      id: Date.now().toString(),
      user: currentUser?.name || '',
      url: newLinkUrl,
      description: newLinkDesc || 'Material cargado',
      timestamp: new Date().toLocaleString()
    };
    syncProjects(projects.map(p => p.id === selectedProject.id ? { ...p, enlaces: [link, ...(p.enlaces || [])] } : p));
    setNewLinkUrl('');
    setNewLinkDesc('');
  };

  const handleAvanzar = (id: string) => {
    const project = projects.find(p => p.id === id);
    if (!project) return;
    const areas = project.areas_seleccionadas || [];
    if (areas.includes(project.etapa_actual) && !project.correccion_ok) {
      alert("⚠️ BLOQUEO ISO: Se requiere el Visto Bueno de Control de Calidad.");
      return;
    }
    
    syncProjects(projects.map(p => {
      if (p.id === id) {
        const flow = getProjectFlow(p);
        const idx = flow.indexOf(p.etapa_actual);
        const next = flow[idx + 1];
        
        // --- LOGICA DE TRACKING DE TIEMPOS (ISO) ---
        const newTracking = [...(p.tracking || [])];
        const now = new Date().toISOString();

        let currentLogIndex = -1;
        for (let i = newTracking.length - 1; i >= 0; i--) {
            if (newTracking[i].area === p.etapa_actual && !newTracking[i].end) {
                currentLogIndex = i;
                break;
            }
        }
        
        if (currentLogIndex !== -1) {
            newTracking[currentLogIndex] = { ...newTracking[currentLogIndex], end: now };
        }

        if (!next) {
            return { 
                ...p, 
                etapa_actual: 'Finalizado', 
                status: 'Finalizado',
                fecha_entrega_real: now,
                tracking: newTracking 
            };
        }

        newTracking.push({ area: next, start: now });
        
        // ASIGNACIÓN AUTOMÁTICA AL LÍDER DEL SIGUIENTE ÁREA
        const nextLeader = findLeaderForArea(next);
        let newAssignments = [...(p.asignaciones || [])];
        if (nextLeader) {
            // Remover asignación previa de esta área si existiera para actualizarla
            newAssignments = newAssignments.filter(a => a.area !== next);
            newAssignments.push({
                area: next,
                assignedToId: nextLeader.id,
                assignedToName: nextLeader.name,
                assignedAt: now
            });
        }

        return { ...p, etapa_actual: next, correccion_ok: false, tracking: newTracking, asignaciones: newAssignments };
      }
      return p;
    }));
    setSelectedProject(null);
  };

  // Asignación Manual (Delegación)
  const handleManualAssign = (userId: string) => {
      if (!selectedProject || !currentUser) return;
      const targetUser = users.find(u => u.id === userId);
      if (!targetUser) return;

      const now = new Date().toISOString();
      
      syncProjects(projects.map(p => {
          if (p.id === selectedProject.id) {
              const newAssignments = (p.asignaciones || []).filter(a => a.area !== p.etapa_actual);
              newAssignments.push({
                  area: p.etapa_actual,
                  assignedToId: targetUser.id,
                  assignedToName: targetUser.name,
                  assignedAt: now
              });
              
              const systemComment: ProjectComment = {
                id: Date.now().toString(),
                user: "SYSTEM",
                role: "System",
                text: `🔀 TAREA REASIGNADA\nDe: ${currentUser.name}\nA: ${targetUser.name}`,
                timestamp: new Date().toLocaleString()
              };

              return { ...p, asignaciones: newAssignments, comentarios: [systemComment, ...(p.comentarios || [])] };
          }
          return p;
      }));
      alert(`✅ Tarea asignada correctamente a ${targetUser.name}`);
  };

  const handleQA = (id: string, ok: boolean, notes: string) => {
    syncProjects(projects.map(p => p.id === id ? { ...p, correccion_ok: ok, correccion_notas: notes } : p));
    setSelectedProject(null);
  };

  // --- Funciones de Cancelación y Reactivación ---
  
  // Abre el modal de cancelación (Trigger)
  const handleCancelar = (id: string) => {
    setIsCancelModalOpen(true);
    setCancellationReason('');
  };

  // Ejecuta la cancelación con validación (Logic)
  const confirmCancellation = () => {
    if (!selectedProject) return;
    if (!cancellationReason.trim()) {
        alert("❌ ERROR: El motivo de cancelación es OBLIGATORIO.");
        return;
    }
    
    const now = new Date().toISOString();
    
    syncProjects(projects.map(p => {
        if(p.id === selectedProject.id) {
             const newTracking = [...(p.tracking || [])];
             let currentLogIndex = -1;
             for (let i = newTracking.length - 1; i >= 0; i--) {
                if (newTracking[i].area === p.etapa_actual && !newTracking[i].end) {
                    currentLogIndex = i;
                    break;
                }
             }
             if (currentLogIndex !== -1) {
                newTracking[currentLogIndex] = { ...newTracking[currentLogIndex], end: now };
             }

             // Agregar motivo al muro de comentarios
             const newComment: ProjectComment = {
                 id: Date.now().toString(),
                 user: "SYSTEM",
                 role: "System",
                 text: `⛔ PROYECTO CANCELADO. Motivo: ${cancellationReason}`,
                 timestamp: new Date().toLocaleString()
             };

             return {
                ...p,
                status: 'Cancelado',
                motivo_cancelacion: cancellationReason,
                historial: [...(p.historial || []), { action: "Cancelado", user: currentUser?.name, timestamp: new Date().toLocaleString() }],
                comentarios: [newComment, ...(p.comentarios || [])],
                tracking: newTracking
             }
        }
        return p;
    }));
    
    setIsCancelModalOpen(false);
    setCancellationReason('');
    setSelectedProject(null);
    alert("✅ Proyecto cancelado y registrado correctamente.");
  };

  // Función exclusiva ADMIN para eliminar
  const handleDeleteProject = (id: string) => {
      if (!window.confirm("⚠️ ¿ELIMINAR DEFINITIVAMENTE?\nEsta acción borrará la ODT de la base de datos para siempre.")) return;
      syncProjects(projects.filter(p => p.id !== id));
      setSelectedProject(null);
      alert("🗑️ Proyecto eliminado.");
  };

  // Abrir Modal de Reactivación
  const openReactivationModal = () => {
      if (!selectedProject) return;
      setReactivationData({ stage: selectedProject.etapa_actual, newDate: selectedProject.fecha_entrega_final });
      setIsReactivationModalOpen(true);
  };

  // Procesar Reactivación Compleja
  const handleReactivationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    
    const instructions = reactivationBriefRef.current?.innerHTML;
    const now = new Date().toISOString();

    syncProjects(projects.map(p => {
        if (p.id === selectedProject.id) {
            const newTracking = [...(p.tracking || []), { area: reactivationData.stage, start: now }];
            
            // Asignar al líder de la etapa de reactivación
            const leader = findLeaderForArea(reactivationData.stage);
            let newAssignments = [...(p.asignaciones || [])];
            if(leader) {
                newAssignments.push({
                   area: reactivationData.stage,
                   assignedToId: leader.id,
                   assignedToName: leader.name,
                   assignedAt: now
                });
            }

            // Agregar instrucciones de reactivación al muro
            const newComment: ProjectComment = {
                id: Date.now().toString(),
                user: currentUser?.name || 'Admin',
                role: currentUser?.role || 'Admin',
                text: `🔄 REACTIVACIÓN DE PROYECTO\nNueva Etapa: ${reactivationData.stage}\nNueva Entrega: ${reactivationData.newDate}\n\nInstrucciones: ${instructions || 'Sin instrucciones adicionales.'}`,
                timestamp: new Date().toLocaleString()
            };

            return {
                ...p,
                status: 'Normal',
                etapa_actual: reactivationData.stage,
                fecha_entrega_final: reactivationData.newDate,
                historial: [...(p.historial || []), { action: "Reactivado", user: currentUser?.name, timestamp: new Date().toLocaleString() }],
                tracking: newTracking,
                comentarios: [newComment, ...(p.comentarios || [])],
                asignaciones: newAssignments
            }
        }
        return p;
    }));
    
    setIsReactivationModalOpen(false);
    setSelectedProject(null);
    alert("✅ Proyecto reactivado exitosamente.");
  };

  // --- Métricas Dashboard ---
  const filteredProjects = useMemo(() => {
    return (projects || []).filter(p => p.fecha_inicio.startsWith(filterDate));
  }, [projects, filterDate]);

  const totalFacturado = useMemo(() => {
    return filteredProjects.reduce((sum, p) => sum + (p.costo_estimado || 0), 0);
  }, [filteredProjects]);

  // Data para gráficas
  const activeProjects = (projects || []).filter(p => !['Finalizado', 'Cancelado'].includes(p.status));
  
  // 1. Carga de Trabajo
  const workloadData = productionAreas.map(area => ({
    name: area,
    count: activeProjects.filter(p => p.areas_seleccionadas?.includes(area)).length
  })).filter(item => item.count > 0);

  // 2. Estado de Alerta (SLA Logic)
  const delayedCount = activeProjects.filter(p => {
    const sla = checkSLA(p);
    return sla.alert;
  }).length;

  // 3. Performance Mensual
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const finishedThisMonth = (projects || []).filter(p => {
    if (p.status !== 'Finalizado' || !p.fecha_entrega_real) return false;
    const date = new Date(p.fecha_entrega_real);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });
  
  const onTimeCount = finishedThisMonth.filter(p => {
    if (!p.fecha_entrega_real) return false;
    const real = new Date(p.fecha_entrega_real).setHours(0,0,0,0);
    const target = new Date(p.fecha_entrega_final).setHours(0,0,0,0);
    return real <= target;
  }).length;

  const performanceData = [
    { name: 'A Tiempo', value: onTimeCount },
    { name: 'Retrasados', value: finishedThisMonth.length - onTimeCount }
  ];

  const activeProject = selectedProject ? projects.find(p => p.id === selectedProject.id) : null;

  // NOTIFICACIONES DE ASIGNACIÓN
  const myAssignments = activeProjects.filter(p => {
      const assignment = (p.asignaciones || []).find(a => a.area === p.etapa_actual);
      return assignment && assignment.assignedToId === currentUser?.id;
  });

  // Filtered List for ODT Tray
  const trayProjects = useMemo(() => {
     let filtered = (projects || []).filter(p => !['Finalizado', 'Cancelado'].includes(p.status));
     if (searchTerm) {
         const lower = searchTerm.toLowerCase();
         filtered = filtered.filter(p => 
            p.id.toLowerCase().includes(lower) || 
            p.empresa.toLowerCase().includes(lower) || 
            p.marca.toLowerCase().includes(lower)
         );
     }
     return filtered;
  }, [projects, searchTerm]);

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6 relative overflow-hidden font-sans">
        {/* Decoración de Fondo Corporativo */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-pink-500 rounded-full blur-[150px] opacity-20"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-500 rounded-full blur-[150px] opacity-20"></div>

        <div className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-200 shadow-xl">
          {isCloudEnabled && !dbError ? <Cloud size={14} className="text-teal-500"/> : <CloudOff size={14} className="text-red-400"/>}
          <span className={`text-[10px] font-black uppercase tracking-widest ${isCloudEnabled && !dbError ? 'text-teal-600' : 'text-red-400'}`}>
            {isCloudEnabled && !dbError ? 'Nube Activa' : 'Offline'}
          </span>
        </div>

        <form onSubmit={handleLogin} className="w-full max-w-md bg-white rounded-[40px] p-12 shadow-2xl relative z-10 border border-slate-100">
          <div className="flex flex-col items-center mb-10">
            {/* Logo Estilo APC */}
            <div className="relative w-20 h-20 mb-6">
                <div className="absolute inset-0 bg-pink-500 rounded-lg transform rotate-45 opacity-90 shadow-lg"></div>
                <div className="absolute inset-2 bg-teal-600 rounded flex items-center justify-center shadow-inner">
                    <span className="text-white font-black text-2xl italic tracking-tighter">APC</span>
                </div>
            </div>
            
            <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Portal ODT v11</h1>
            <p className="text-[10px] text-teal-600 font-bold uppercase tracking-[0.2em] mt-2 italic text-center">Ideas frescas y saludables</p>
          </div>
          <div className="space-y-6">
            <input type="text" value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-900 outline-none focus:border-pink-400 transition-colors" placeholder="Usuario" required />
            <input type="password" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-900 outline-none focus:border-pink-400 transition-colors" placeholder="Contraseña" required />
            <button type="submit" className="w-full py-5 bg-slate-800 hover:bg-slate-900 text-white font-black rounded-2xl uppercase text-xs transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1">Acceder</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col p-6 shadow-sm z-20">
        <div className="flex items-center gap-4 mb-10 px-2">
          {/* Logo Miniatura */}
          <div className="relative w-10 h-10 flex-shrink-0">
             <div className="absolute inset-0 bg-pink-500 rounded transform rotate-45 shadow"></div>
             <div className="absolute inset-0.5 bg-teal-600 rounded flex items-center justify-center">
                <span className="text-white font-black text-[10px] italic">APC</span>
             </div>
          </div>
          <div>
              <h1 className="font-black text-lg leading-none tracking-tight" style={{ color: COLORS.dark }}>APC <span className="text-teal-600">Publicidad</span></h1>
              <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-1 font-bold italic">SISTEMA ISO</p>
          </div>
        </div>
        <nav className="space-y-1 flex-1">
          <MenuBtn active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<LayoutDashboard size={18}/>} label="Dashboard" />
          <MenuBtn active={view === 'proyectos'} onClick={() => setView('proyectos')} icon={<Briefcase size={18}/>} label="Bandeja ODT" />
          {/* RENAMED FROM ADUANA QA */}
          {['Admin', 'Corrección'].includes(currentUser.role) && <MenuBtn active={view === 'correccion'} onClick={() => setView('correccion')} icon={<ShieldCheck size={18}/>} label="Control de Calidad APC" />}
          <MenuBtn active={view === 'historico'} onClick={() => setView('historico')} icon={<History size={18}/>} label="Archivo" />
          {currentUser.role === 'Admin' && <MenuBtn active={view === 'usuarios'} onClick={() => setView('usuarios')} icon={<UsersIcon size={18}/>} label="Usuarios" />}
        </nav>
        <div className="mt-auto flex flex-col gap-4">
           <div className={`px-4 py-3 rounded-xl border flex items-center gap-3 ${isCloudEnabled && !dbError ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-red-50 border-red-200 text-red-500'}`}>
              {isCloudEnabled && !dbError ? <Cloud size={16}/> : <CloudOff size={16}/>}
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest">{isCloudEnabled && !dbError ? 'ONLINE' : 'ERROR'}</p>
                <p className="text-[9px] opacity-70 truncate max-w-[140px]">{dbError ? 'Fallo conexión' : 'Sincronizado'}</p>
              </div>
           </div>
           <div className="px-4 py-3 rounded-xl bg-slate-100 flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center font-bold text-slate-600 text-xs">
                   {currentUser.name.charAt(0)}
               </div>
               <div className="flex-1 min-w-0">
                   <p className="text-[10px] font-bold text-slate-700 truncate">{currentUser.name}</p>
                   <p className="text-[8px] text-slate-500 uppercase">{currentUser.role}</p>
               </div>
           </div>
           <button onClick={handleLogout} className="py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase flex items-center justify-center gap-2 transition-colors"><LogOut size={12}/> Cerrar Sesión</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-[#f8fafc]">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
          <div className="flex items-center gap-4">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{view}</h2>
              {/* ALARM BADGE */}
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg">
                  <Bell size={14} className={myAssignments.length > 0 || delayedCount > 0 ? "text-pink-500 animate-pulse" : "text-slate-400"} />
                  <span className="text-[10px] font-bold text-slate-600">
                      {myAssignments.length} Asignaciones | {delayedCount} Alertas SLA
                  </span>
              </div>
          </div>
          {['Admin', 'Cuentas'].includes(currentUser.role) && view !== 'usuarios' && view !== 'historico' && <button onClick={() => setIsModalOpen(true)} className="h-11 px-6 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs rounded-xl shadow-lg transition-all">+ NUEVA ODT</button>}
          {view === 'usuarios' && <button onClick={() => setIsUserModalOpen(true)} className="h-11 px-6 bg-slate-800 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-2"><UserPlus size={16}/> NUEVO USUARIO</button>}
          {view === 'historico' && (
            <button onClick={handleExportCSV} className="h-11 px-6 bg-slate-800 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-2 hover:bg-teal-600 transition-all">
                <Download size={16}/> DESCARGAR REPORTE GLOBAL
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {view === 'dashboard' ? (
             <div className="space-y-6 animate-in fade-in pb-10">
                {/* Banner de Notificaciones Personales */}
                {myAssignments.length > 0 && (
                    <div className="bg-pink-50 border border-pink-100 p-4 rounded-2xl flex items-center gap-4 shadow-sm animate-pulse">
                        <div className="p-2 bg-pink-100 rounded-xl text-pink-600"><Bell size={20}/></div>
                        <div>
                            <h4 className="font-black text-sm text-pink-700">¡Tienes {myAssignments.length} ODTs asignadas!</h4>
                            <p className="text-xs text-pink-500">Revisa la bandeja para ver tus tareas pendientes.</p>
                        </div>
                    </div>
                )}

                {/* Filtro y Resumen Financiero */}
                <div className="bg-white border border-slate-200 p-6 rounded-[32px] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                   <div>
                      <h3 className="text-xl font-black text-slate-800 italic uppercase tracking-tighter flex items-center gap-3">
                         <div className="p-2 bg-pink-50 rounded-xl text-pink-500"><DollarSign size={24}/></div>
                         Resumen Financiero
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 pl-1">
                         Facturación correspondiente a: <span className="text-slate-800">{filterDate}</span>
                      </p>
                   </div>
                   
                   <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <input 
                         type="month" 
                         value={filterDate}
                         onChange={(e) => setFilterDate(e.target.value)}
                         className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black text-slate-700 outline-none focus:border-teal-500 transition-all shadow-sm"
                      />
                   </div>
                </div>

                {/* KPIs Generales */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-slate-800 border border-slate-700 p-8 rounded-[40px] flex flex-col justify-center relative overflow-hidden group">
                       <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                          <DollarSign size={80} className="text-pink-500"/>
                       </div>
                       <p className="text-[10px] font-black text-slate-400 uppercase mb-2 italic relative z-10">Facturado (Mes)</p>
                       <p className="text-4xl font-black italic tracking-tighter text-white relative z-10">
                          ${totalFacturado.toLocaleString('es-MX')}
                       </p>
                    </div>

                    <StatCard label="ODTs Activas" value={activeProjects.length} color={COLORS.teal} icon={<Layers size={20}/>} />
                    {/* Alerta de Retraso Chart Value */}
                    <div className="bg-white border border-slate-200 p-8 rounded-[40px] flex items-center justify-between group hover:border-pink-200 transition-all">
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-2 italic">Alertas ISO / SLA</p>
                          <p className={`text-4xl font-black italic tracking-tighter ${delayedCount > 0 ? 'text-pink-600' : 'text-slate-800'}`}>{delayedCount}</p>
                          <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold">Riesgo Alto</p>
                       </div>
                       <div className={`p-4 rounded-2xl ${delayedCount > 0 ? 'bg-pink-100 text-pink-600 animate-pulse' : 'bg-slate-50 text-slate-300'}`}><AlertTriangle size={20}/></div>
                    </div>
                    <StatCard label="Terminadas (Global)" value={(projects || []).filter(p => p.status === 'Finalizado').length} color={COLORS.success} icon={<CheckCircle2 size={20}/>} />
                </div>

                {/* NUEVAS GRÁFICAS DE MÉTRICAS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-96">
                    {/* Gráfica 1: Carga de Trabajo */}
                    <div className="bg-white border border-slate-200 p-8 rounded-[40px] shadow-sm flex flex-col">
                        <h4 className="text-sm font-black uppercase text-slate-700 mb-6 flex items-center gap-2">
                           <Layers size={16} className="text-teal-600"/> Carga de Trabajo por Área
                        </h4>
                        <div className="flex-1 min-h-0">
                           <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={workloadData}>
                                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                                 <XAxis dataKey="name" tick={{fontSize: 9, fontWeight: 'bold'}} axisLine={false} tickLine={false} interval={0} angle={-45} textAnchor="end" height={60}/>
                                 <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false}/>
                                 <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}/>
                                 <Bar dataKey="count" fill={COLORS.teal} radius={[6, 6, 0, 0]} barSize={30} />
                              </BarChart>
                           </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Gráfica 2: Performance Mensual */}
                    <div className="bg-white border border-slate-200 p-8 rounded-[40px] shadow-sm flex flex-col">
                        <h4 className="text-sm font-black uppercase text-slate-700 mb-6 flex items-center gap-2">
                           <CheckSquare size={16} className="text-pink-600"/> Performance Mensual (Entregas)
                        </h4>
                        <div className="flex-1 flex items-center justify-center relative">
                           {finishedThisMonth.length > 0 ? (
                             <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={performanceData} layout="vertical">
                                   <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9"/>
                                   <XAxis type="number" hide/>
                                   <YAxis dataKey="name" type="category" tick={{fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} width={80}/>
                                   <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none'}}/>
                                   <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={40}>
                                      {performanceData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index === 0 ? COLORS.success : COLORS.danger} />
                                      ))}
                                   </Bar>
                                </BarChart>
                             </ResponsiveContainer>
                           ) : (
                             <div className="text-center text-slate-300 font-bold uppercase text-xs">Sin entregas este mes</div>
                           )}
                        </div>
                    </div>
                </div>
             </div>
          ) : view === 'usuarios' && currentUser.role === 'Admin' ? (
            <div className="animate-in fade-in space-y-6">
               <div className="bg-pink-50 border border-pink-100 p-6 rounded-[32px] flex items-center justify-between">
                  <div className="flex items-center gap-4 text-pink-800">
                     <div className="w-10 h-10 bg-pink-200 rounded-full flex items-center justify-center"><AlertTriangle size={20}/></div>
                     <div>
                       <h4 className="font-black text-sm uppercase">Zona de Peligro / Sync</h4>
                       <p className="text-[10px] opacity-70">Usa esto si los usuarios no aparecen en otras PCs.</p>
                     </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={verifyCloudData} className="px-6 py-3 bg-white hover:bg-slate-50 text-pink-600 border border-pink-200 rounded-xl font-black text-[10px] uppercase shadow-sm flex items-center gap-2 transition-all">
                        <SearchCheck size={14}/> Verificar Estado
                    </button>
                    <button onClick={forcePushToCloud} className="px-6 py-3 bg-pink-500 hover:bg-pink-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg flex items-center gap-2 transition-all">
                        <UploadCloud size={14}/> ☁️ Forzar Subida
                    </button>
                    <button onClick={handlePurgeDatabase} className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-[10px] uppercase shadow-lg flex items-center gap-2 transition-all ml-2">
                        <Trash2 size={14}/> PURGAR BD
                    </button>
                  </div>
               </div>
               <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                     <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                           <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Nombre</th>
                           <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Usuario</th>
                           <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Rol / Área</th>
                           <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Acción</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {(users || []).map(u => (
                          <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                             <td className="px-8 py-5 font-black text-slate-800 text-sm">{u.name}</td>
                             <td className="px-8 py-5 font-mono text-[10px] text-slate-500 font-bold">{u.username}</td>
                             <td className="px-8 py-5"><span className="px-3 py-1 bg-teal-50 text-teal-700 rounded-lg text-[9px] font-black uppercase border border-teal-100">{u.role}</span></td>
                             <td className="px-8 py-5 text-right">
                               <button onClick={() => deleteUser(u.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                             </td>
                          </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          ) : view === 'proyectos' || view === 'correccion' ? (
            <div className="space-y-4">
                {/* Search Bar */}
                {view === 'proyectos' && (
                    <div className="bg-white border border-slate-200 p-4 rounded-[24px] shadow-sm flex items-center gap-4 mb-6">
                        <Search size={20} className="text-slate-400"/>
                        <input 
                            type="text" 
                            placeholder="Buscar por ID, Laboratorio o Marca..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1 bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:font-normal placeholder:text-slate-400"
                        />
                        {searchTerm && <button onClick={() => setSearchTerm('')}><X size={16} className="text-slate-400 hover:text-red-500"/></button>}
                    </div>
                )}

               {(view === 'proyectos' ? trayProjects : projects).filter(p => !['Finalizado', 'Cancelado'].includes(p.status)).map(p => {
                 const slaStatus = checkSLA(p);
                 const currentAssignee = (p.asignaciones || []).find(a => a.area === p.etapa_actual);
                 
                 return (
                 <div key={p.id} onClick={() => setSelectedProject(p)} className={`bg-white border rounded-[32px] p-6 flex items-center justify-between hover:shadow-lg transition-all cursor-pointer group 
                     ${slaStatus.alert ? 'border-pink-500 animate-pulse bg-pink-50/10' : 'border-slate-200 hover:border-teal-200'}`}>
                    <div className="flex items-center gap-6">
                      <div className={`w-14 h-14 border rounded-2xl flex flex-col items-center justify-center font-black transition-colors ${slaStatus.alert ? 'bg-pink-100 text-pink-600 border-pink-200' : 'bg-slate-50 border-slate-100 text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-600'}`}>
                         <span className="text-[8px] opacity-40 uppercase tracking-widest">ODT</span>{p.id.replace('ODT-', '')}
                      </div>
                      <div>
                          <h4 className={`font-black text-lg ${slaStatus.alert ? 'text-pink-700' : 'text-slate-800'}`}>{p.empresa}</h4>
                          <p className="text-[11px] text-slate-500 font-bold uppercase">{p.marca} — {p.producto}</p>
                          {currentAssignee && (
                              <div className="flex items-center gap-1 mt-1">
                                  <UserCog size={10} className="text-slate-400"/>
                                  <span className="text-[9px] text-slate-400 uppercase font-bold">{currentAssignee.assignedToName || 'Sin asignar'}</span>
                              </div>
                          )}
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Status Actual</p>
                       <p className={`font-black uppercase tracking-tighter text-xl ${slaStatus.alert ? 'text-pink-600' : 'text-teal-600'}`}>{p.etapa_actual}</p>
                       {slaStatus.alert && (
                           <span className="inline-block mt-1 px-2 py-0.5 rounded bg-pink-100 text-pink-700 text-[9px] font-black uppercase">
                               SLA {slaStatus.type} (+{slaStatus.hours}h)
                           </span>
                       )}
                    </div>
                 </div>
               )})}
               
               {view === 'proyectos' && trayProjects.length === 0 && (
                   <div className="text-center py-10 text-slate-400 text-xs uppercase font-bold tracking-widest">No se encontraron proyectos</div>
               )}
            </div>
          ) : view === 'historico' ? (
            <div className="space-y-4 animate-in fade-in">
                {(projects || []).filter(p => ['Finalizado', 'Cancelado'].includes(p.status)).map(p => (
                    <div key={p.id} onClick={() => setSelectedProject(p)} className={`border rounded-[32px] p-6 flex items-center justify-between hover:shadow-lg transition-all cursor-pointer bg-slate-50 border-slate-200 opacity-80 hover:opacity-100`}>
                        <div className="flex items-center gap-6">
                            <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black ${p.status === 'Cancelado' ? 'bg-pink-50 text-pink-300' : 'bg-teal-50 text-teal-300'}`}>
                                <span className="text-[8px] opacity-40 uppercase tracking-widest">ODT</span>{p.id.replace('ODT-', '')}
                            </div>
                            <div>
                                <h4 className="font-black text-lg text-slate-600">{p.empresa}</h4>
                                <p className="text-[11px] text-slate-400 font-bold uppercase">{p.marca} — {p.producto}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${p.status === 'Cancelado' ? 'bg-pink-100 text-pink-600' : 'bg-teal-100 text-teal-700'}`}>
                                {p.status}
                            </span>
                            <p className="text-[9px] text-slate-400 font-bold mt-2">{p.fecha_entrega_final}</p>
                        </div>
                    </div>
                ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-300 font-black text-xs uppercase tracking-[0.4em]">Sección no disponible</div>
          )}
        </div>
      </main>

      {/* Modal Detalle ODT */}
      {activeProject && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[150] flex items-center justify-end p-4 lg:p-8 animate-in fade-in duration-300">
           <div className="w-full max-w-7xl bg-white h-full rounded-[60px] shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in slide-in-from-right duration-500">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-20">
                <div className="flex items-center gap-6">
                  <div className="px-5 py-2 bg-slate-50 border border-slate-200 rounded-2xl font-black text-teal-600 text-xl tracking-tighter">{activeProject.id}</div>
                  <div><h2 className="text-3xl font-black italic text-slate-800 tracking-tighter uppercase leading-tight">{activeProject.empresa}</h2><p className="text-[10px] text-slate-400 font-black tracking-widest uppercase">{activeProject.marca} — {activeProject.producto}</p></div>
                </div>
                <button onClick={() => setSelectedProject(null)} className="w-12 h-12 flex items-center justify-center bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-all text-slate-400 text-2xl">✕</button>
              </div>

              <div className="flex-1 flex overflow-hidden">
                 <div className="flex-1 flex flex-col bg-slate-50/20 border-r border-slate-100 overflow-y-auto custom-scrollbar p-8 space-y-10">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       
                       {/* Panel de Asignación Manual (Solo Líderes de la etapa actual) */}
                       {currentUser.isLeader && currentUser.role === activeProject.etapa_actual && (
                           <div className="col-span-1 md:col-span-2 bg-indigo-50 border border-indigo-100 p-6 rounded-[32px] shadow-sm flex items-center justify-between">
                               <div className="flex items-center gap-4">
                                   <div className="w-10 h-10 bg-indigo-200 text-indigo-700 rounded-full flex items-center justify-center">
                                       <UserCog size={18}/>
                                   </div>
                                   <div>
                                       <h4 className="text-xs font-black uppercase text-indigo-700">Asignar Tarea (Delegación)</h4>
                                       <p className="text-[10px] text-indigo-400 font-medium">Asigna esta ODT a un miembro de tu equipo</p>
                                   </div>
                               </div>
                               <select 
                                   className="bg-white border border-indigo-200 text-indigo-700 text-xs font-bold uppercase rounded-xl px-4 py-2 outline-none"
                                   onChange={(e) => {
                                       if(e.target.value) handleManualAssign(e.target.value);
                                   }}
                                   value=""
                               >
                                   <option value="">Seleccionar Usuario...</option>
                                   {users.filter(u => u.role === activeProject.etapa_actual && !u.isLeader).map(u => (
                                       <option key={u.id} value={u.id}>{u.name}</option>
                                   ))}
                               </select>
                           </div>
                       )}

                       {['Admin', 'Cuentas'].includes(currentUser.role) && (
                          <div className="col-span-1 md:col-span-2 bg-white border border-slate-200 p-6 rounded-[32px] shadow-sm flex items-center justify-between">
                             <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                                   <Power size={18}/>
                                </div>
                                <div>
                                   <h4 className="text-xs font-black uppercase text-slate-700">Gestión de Ciclo de Vida</h4>
                                   <p className="text-[10px] text-slate-400 font-medium">Control exclusivo de Cuentas/Admin</p>
                                </div>
                             </div>
                             <div className="flex gap-2">
                                {/* Botones de Gestión de Estado */}
                                {['Cancelado', 'Finalizado'].includes(activeProject.status) ? (
                                   <button 
                                      onClick={openReactivationModal}
                                      className="px-6 py-3 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-[10px] font-black uppercase hover:bg-blue-100 transition-all flex items-center gap-2"
                                   >
                                      <RefreshCw size={14}/> Reactivar Proyecto
                                   </button>
                                ) : (
                                   <button 
                                      onClick={() => handleCancelar(activeProject.id)}
                                      className="px-6 py-3 bg-pink-50 text-pink-600 border border-pink-100 rounded-xl text-[10px] font-black uppercase hover:bg-pink-100 transition-all flex items-center gap-2"
                                   >
                                      <Ban size={14}/> Cancelar Proyecto
                                   </button>
                                )}

                                {/* Botón de Eliminación (Solo Admin) */}
                                {currentUser.role === 'Admin' && (
                                    <button 
                                        onClick={() => handleDeleteProject(activeProject.id)}
                                        className="px-6 py-3 bg-slate-800 text-white border border-slate-800 rounded-xl text-[10px] font-black uppercase hover:bg-red-600 hover:border-red-600 transition-all flex items-center gap-2 ml-2"
                                        title="Eliminar permanentemente de la base de datos"
                                    >
                                        <Trash2 size={14}/>
                                    </button>
                                )}
                             </div>
                          </div>
                       )}

                       {/* Información de Facturación (Nueva Lógica) */}
                       {['Admin', 'Administración'].includes(currentUser.role) && (
                          <div className="bg-slate-800 p-8 rounded-[40px] text-white shadow-xl">
                             <h3 className="text-[10px] font-black uppercase text-teal-400 mb-6 tracking-widest flex items-center gap-2"><Wallet size={18}/> Finanzas</h3>
                             
                             {activeProject.se_factura ? (
                                <>
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-xs font-bold text-slate-400 uppercase">Monto Cotizado</span>
                                        <span className="text-2xl font-black text-white">${(activeProject.costo_estimado || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10">
                                        <span className="text-xs font-bold text-white uppercase">Estatus</span>
                                        <button 
                                        onClick={() => syncProjects(projects.map(p => p.id === activeProject.id ? { ...p, pagado: !p.pagado } : p))}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeProject.pagado ? 'bg-teal-500 text-white' : 'bg-pink-500/20 text-pink-400 border border-pink-500/50'}`}
                                        >
                                        {activeProject.pagado ? 'PAGADA' : 'PENDIENTE'}
                                        </button>
                                    </div>
                                </>
                             ) : (
                                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                    <p className="text-[10px] font-black uppercase text-pink-400 mb-2">NO SE FACTURA</p>
                                    <p className="text-xs text-slate-300 italic">"{activeProject.justificacion_no_factura}"</p>
                                </div>
                             )}
                          </div>
                       )}

                       {/* Control de Calidad APC */}
                       {currentUser.role === 'Corrección' && (
                          <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-xl">
                             <h3 className="text-[10px] font-black uppercase text-teal-400 mb-6 tracking-widest flex items-center gap-2"><ShieldCheck size={18}/> Control de Calidad APC</h3>
                             <textarea 
                                className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-sm text-white outline-none mb-6 min-h-[80px]"
                                placeholder="Notas de validación..."
                                value={activeProject.correccion_notas}
                                onChange={(e) => syncProjects(projects.map(p => p.id === activeProject.id ? { ...p, correccion_notas: e.target.value } : p))}
                             />
                             <div className="flex gap-4">
                                <button onClick={() => handleQA(activeProject.id, true, activeProject.correccion_notas)} className="flex-1 py-4 bg-teal-600 rounded-2xl font-black text-[10px] uppercase">APROBAR QA ✓</button>
                                <button onClick={() => handleQA(activeProject.id, false, activeProject.correccion_notas)} className="flex-1 py-4 bg-pink-600/50 rounded-2xl font-black text-[10px] uppercase">RECHAZAR</button>
                             </div>
                          </div>
                       )}

                       {((activeProject.etapa_actual === currentUser.role) || 
                         (currentUser.role === 'Admin') || 
                         (activeProject.etapa_actual === 'Cuentas (Cierre)' && currentUser.role === 'Cuentas')
                       ) && (
                          <div className="bg-teal-600 p-8 rounded-[40px] text-white flex flex-col justify-between shadow-xl">
                            <h4 className="text-xl font-black italic">¿Material terminado en {activeProject.etapa_actual}?</h4>
                            <button onClick={() => handleAvanzar(activeProject.id)} className="mt-4 w-full py-5 bg-slate-900 rounded-3xl font-black text-[10px] uppercase shadow-xl flex items-center justify-center gap-3">ENVIAR A SIGUIENTE <ArrowRight size={16}/></button>
                          </div>
                       )}
                    </div>

                    {/* Brief con Rich Text Renderizado */}
                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                            <ClipboardCheck size={16} className="text-teal-600"/> Brief y Materiales
                        </h4>
                        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                            <div 
                                className="prose prose-sm max-w-none text-slate-600"
                                dangerouslySetInnerHTML={{__html: activeProject.materiales}}
                            />
                        </div>
                    </div>

                    {/* Muro de Comentarios */}
                    <div className="space-y-6">
                       <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><MessageSquare size={16} className="text-teal-600"/> Muro de Colaboración</h4>
                       <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                          <div className="flex gap-4">
                             <textarea 
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                                className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm text-slate-900 outline-none"
                                placeholder="Escribir nota..."
                             />
                             <button onClick={handleAddComment} className="w-14 h-14 bg-slate-800 text-white rounded-2xl flex items-center justify-center hover:bg-teal-600 transition-all"><Send size={20}/></button>
                          </div>
                          <div className="space-y-4 mt-6">
                             {(activeProject.comentarios || []).map(c => (
                               <div key={c.id} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 relative group">
                                  <div className="flex justify-between mb-2">
                                     <span className="text-[10px] font-black text-slate-800 uppercase">{c.user} <span className="text-teal-600 ml-2 font-bold opacity-70">({c.role})</span></span>
                                     <span className="text-[8px] font-mono text-slate-400 italic">{c.timestamp}</span>
                                  </div>
                                  <p className="text-sm text-slate-600 leading-relaxed font-medium whitespace-pre-line">{c.text}</p>
                               </div>
                             ))}
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="w-96 p-8 space-y-12 bg-white overflow-y-auto border-l border-slate-100">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 mb-10 tracking-[0.4em] flex items-center gap-3 font-bold"><Clock size={16} className="text-teal-600"/> Hoja de Ruta</h3>
                    <div className="space-y-8 pl-4 relative">
                       <div className="absolute left-[25px] top-2 bottom-2 w-px bg-slate-100"></div>
                       {getProjectFlow(activeProject).map((d, idx) => {
                          const currentIdx = getProjectFlow(activeProject).indexOf(activeProject.etapa_actual);
                          const isDone = idx < currentIdx;
                          const isCurrent = idx === currentIdx;
                          return (
                            <div key={d} className={`flex items-start gap-6 relative z-10 transition-all duration-500 ${idx > currentIdx + 1 ? 'opacity-20' : 'opacity-100'}`}>
                               <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${isDone ? 'bg-teal-500 shadow-lg' : isCurrent ? 'bg-teal-600 scale-125 shadow-xl' : 'bg-white border-2 border-slate-100'}`}>{isDone ? <CheckCircle2 size={16} className="text-white"/> : null}</div>
                               <div className="flex flex-col pt-1">
                                  <span className={`text-[10px] font-black uppercase tracking-widest ${isCurrent ? 'text-teal-700' : isDone ? 'text-slate-500' : 'text-slate-300'}`}>{d}</span>
                               </div>
                            </div>
                          );
                       })}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Modal de Reactivación (Nuevo) */}
      {isReactivationModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[250] flex items-center justify-center p-6 animate-in zoom-in duration-300">
              <div className="w-full max-w-2xl bg-white rounded-[40px] shadow-2xl p-10 border border-slate-200">
                  <div className="flex justify-between items-center mb-8">
                     <div>
                        <h3 className="text-2xl font-black italic text-slate-900 uppercase tracking-tighter">Reactivar ODT</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Definir nuevos parámetros de flujo</p>
                     </div>
                     <button onClick={() => setIsReactivationModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-50 text-slate-400 hover:text-pink-500 transition-colors">✕</button>
                  </div>

                  <form onSubmit={handleReactivationSubmit} className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-slate-400 pl-2">Retomar en Etapa</label>
                              <div className="relative">
                                  <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                  <select 
                                      required
                                      value={reactivationData.stage}
                                      onChange={(e) => setReactivationData({...reactivationData, stage: e.target.value})}
                                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold uppercase outline-none focus:border-teal-500 transition-all appearance-none"
                                  >
                                      <option value="">Seleccionar...</option>
                                      <option value="Cuentas">Cuentas</option>
                                      {selectedProject?.areas_seleccionadas.map(area => (
                                          <option key={area} value={area}>{area}</option>
                                      ))}
                                      <option value="Corrección">Corrección</option>
                                      <option value="Cuentas (Cierre)">Cuentas (Cierre)</option>
                                  </select>
                              </div>
                          </div>
                          
                          <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase text-slate-400 pl-2">Nueva Fecha Entrega</label>
                              <div className="relative">
                                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                  <input 
                                      type="date"
                                      required
                                      value={reactivationData.newDate}
                                      onChange={(e) => setReactivationData({...reactivationData, newDate: e.target.value})}
                                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold outline-none focus:border-teal-500 transition-all"
                                  />
                              </div>
                          </div>
                      </div>

                      <div className="space-y-2">
                          <div className="flex justify-between items-end">
                              <label className="text-[10px] font-black uppercase text-slate-400 pl-2">Instrucciones de Reactivación</label>
                              <span className="text-[9px] text-teal-600 font-bold bg-teal-50 px-2 py-0.5 rounded">Soporta HTML/Excel</span>
                          </div>
                          <div 
                              ref={reactivationBriefRef}
                              contentEditable
                              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-700 outline-none overflow-y-auto custom-scrollbar min-h-[120px] focus:bg-white focus:border-teal-300 transition-colors"
                              style={{ whiteSpace: 'pre-wrap' }}
                              onPaste={() => {}} // Permitir pegado nativo
                          />
                          <p className="text-[9px] text-slate-400 italic pl-2">Describe por qué se reactiva y qué cambios se requieren.</p>
                      </div>

                      <button type="submit" className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2">
                          <RefreshCw size={16}/> Confirmar Reactivación
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* NUEVO Modal de Cancelación */}
      {isCancelModalOpen && (
          <div className="fixed inset-0 bg-pink-900/60 backdrop-blur-xl z-[300] flex items-center justify-center p-6 animate-in zoom-in duration-300">
              <div className="w-full max-w-lg bg-white rounded-[40px] shadow-2xl p-10 border border-slate-200">
                  <div className="flex justify-between items-center mb-6">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center"><Ban size={20}/></div>
                        <div>
                           <h3 className="text-2xl font-black italic text-slate-900 uppercase tracking-tighter">Cancelar ODT</h3>
                           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Esta acción es irreversible</p>
                        </div>
                     </div>
                     <button onClick={() => setIsCancelModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-50 text-slate-400 hover:text-pink-500 transition-colors">✕</button>
                  </div>

                  <div className="space-y-6">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-pink-500 pl-2">Motivo de Cancelación (Obligatorio)</label>
                          <textarea 
                              value={cancellationReason}
                              onChange={(e) => setCancellationReason(e.target.value)}
                              className="w-full bg-pink-50 border border-pink-100 rounded-3xl p-6 text-xs font-bold text-slate-800 outline-none focus:border-pink-300 focus:bg-white transition-all min-h-[120px] placeholder-pink-200"
                              placeholder="Describe detalladamente por qué se cancela este proyecto..."
                          />
                      </div>

                      <div className="flex gap-4">
                          <button onClick={() => setIsCancelModalOpen(false)} className="flex-1 py-4 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-2xl text-[10px] font-black uppercase transition-all">
                              Volver
                          </button>
                          <button 
                              onClick={confirmCancellation}
                              disabled={!cancellationReason.trim()}
                              className="flex-1 py-4 bg-pink-600 disabled:bg-pink-300 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:shadow-pink-500/30 transition-all flex items-center justify-center gap-2"
                          >
                              <Ban size={16}/> Confirmar Cancelación
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* NUEVO Modal ODT Dinámico */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xl z-[200] flex items-center justify-center p-6 animate-in zoom-in duration-300">
          <div className="w-full max-w-5xl bg-white rounded-[60px] shadow-2xl p-10 border border-slate-200 overflow-y-auto max-h-[90vh]">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-3xl font-black italic text-slate-900 uppercase tracking-tighter leading-none">Nueva ODT</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-2xl hover:text-pink-500 transition-colors">✕</button>
             </div>
             
             <form onSubmit={handleCreateODT} className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Columna Izquierda: Datos Principales */}
                <div className="space-y-5">
                   <div className="grid grid-cols-2 gap-4">
                      <Input label="ID ODT" name="id_odt" required placeholder="Ej: ODT-5501" />
                      <Input label="Fecha Entrega" name="fecha" type="date" required />
                   </div>
                   <Input label="Laboratorio" name="empresa" required placeholder="Ej: Bayer" />
                   <div className="grid grid-cols-2 gap-4">
                      <Input label="Marca" name="marca" required placeholder="Ej: Aspirina" />
                      <Input label="Producto / Campaña" name="producto" required placeholder="Q3 Launch" />
                   </div>

                   {/* Categorización Condicional */}
                   <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Categorización de Material</label>
                      <div className="grid grid-cols-2 gap-4">
                         <select 
                            value={formType} 
                            onChange={e => { setFormType(e.target.value); setFormSubType(''); }} 
                            className="bg-white border border-slate-200 rounded-2xl p-3 text-xs font-bold uppercase outline-none"
                            required
                         >
                            <option value="">Seleccionar Tipo...</option>
                            {Object.keys(typeOptions).map(t => <option key={t} value={t}>{t}</option>)}
                         </select>

                         {typeOptions[formType]?.length > 0 && (
                             <select 
                                value={formSubType}
                                onChange={e => setFormSubType(e.target.value)}
                                className="bg-white border border-slate-200 rounded-2xl p-3 text-xs font-bold uppercase outline-none animate-in fade-in"
                                required
                             >
                                <option value="">Seleccionar Subtipo...</option>
                                {typeOptions[formType].map(st => <option key={st} value={st}>{st}</option>)}
                             </select>
                         )}
                      </div>
                      {formSubType === 'Otro' && (
                          <input type="text" name="otro_tipo" placeholder="Especificar..." className="w-full bg-white border border-slate-200 rounded-2xl p-3 text-xs font-bold outline-none" />
                      )}
                   </div>

                   {/* Facturación */}
                   <div className="p-5 bg-indigo-50/50 rounded-3xl border border-indigo-100 space-y-3">
                      <div className="flex items-center justify-between">
                         <label className="text-[10px] font-black text-indigo-400 uppercase">¿Se Factura?</label>
                         <div className="flex gap-2">
                            <button type="button" onClick={() => setIsBilling(true)} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${isBilling ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-300'}`}>SÍ</button>
                            <button type="button" onClick={() => setIsBilling(false)} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${!isBilling ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-300'}`}>NO</button>
                         </div>
                      </div>
                      {isBilling ? (
                         <div className="relative">
                            <input name="costo" type="number" required placeholder="Monto Cotizado (MXN)" min="0" className="w-full bg-white border border-indigo-100 rounded-2xl p-3 pl-8 text-sm font-bold text-slate-800 outline-none" />
                            <span className="absolute left-3 top-3 text-slate-400 font-bold">$</span>
                         </div>
                      ) : (
                         <input name="justificacion" type="text" required placeholder="Justificación obligatoria..." className="w-full bg-white border border-red-100 rounded-2xl p-3 text-xs font-bold text-red-500 outline-none placeholder-red-200" />
                      )}
                   </div>
                </div>

                {/* Columna Derecha: Áreas y Rich Text */}
                <div className="space-y-6 flex flex-col h-full">
                   <div>
                       <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Áreas Participantes (Multiselección)</h4>
                       <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                          {productionAreas.map(area => (
                            <div 
                              key={area} 
                              onClick={() => setSelectedAreas(prev => prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area])}
                              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${selectedAreas.includes(area) ? 'bg-teal-600 border-teal-600 text-white' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-white'}`}
                            >
                               <span className="text-[9px] font-black uppercase">{area}</span>
                               {selectedAreas.includes(area) && <CheckCircle2 size={12}/>}
                            </div>
                          ))}
                       </div>
                   </div>

                   <div className="flex-1 flex flex-col">
                       <div className="flex justify-between items-end mb-2">
                          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Brief / Materiales</label>
                          <span className="text-[9px] text-teal-600 font-bold bg-teal-50 px-2 py-0.5 rounded">Soporta Tablas Excel</span>
                       </div>
                       <div 
                          ref={briefRef}
                          contentEditable
                          className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-3xl p-4 text-xs text-slate-700 outline-none overflow-y-auto custom-scrollbar min-h-[150px] focus:bg-white focus:border-teal-300 transition-colors"
                          style={{ whiteSpace: 'pre-wrap' }}
                          onPaste={(e) => {
                             // Permitir pegado normal, el navegador maneja las tablas HTML
                             // Solo prevenimos pegado de scripts maliciosos si fuera necesario
                          }}
                       />
                       <p className="text-[8px] text-slate-400 mt-2 italic text-right">* Pega aquí tablas directamente desde Excel o Word.</p>
                   </div>

                   <button type="submit" className="w-full py-6 bg-slate-800 text-white font-black rounded-[24px] uppercase shadow-xl hover:bg-teal-600 transition-all flex items-center justify-center gap-2">
                       <Plus size={18}/> Crear ODT
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Modal Usuario (Sin cambios) */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xl z-[200] flex items-center justify-center p-6 animate-in zoom-in duration-300">
           <div className="w-full max-w-lg bg-white rounded-[40px] shadow-2xl p-10 border border-slate-200">
              <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-8 text-slate-900">Crear Acceso</h3>
              <form onSubmit={handleCreateUser} className="space-y-6">
                 <Input label="Nombre Completo" name="name" required placeholder="Ej: Juan Pérez" />
                 <Input label="Usuario (Login)" name="username" required placeholder="Ej: j.perez" />
                 <Input label="Contraseña" name="password" type="password" required placeholder="••••••••" />
                 <div className="grid grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 pl-4">Rol / Área</label>
                      <select name="role" className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold text-slate-900 outline-none">
                         {['Admin', 'Cuentas', 'Creativos', 'Médicos', 'Diseño', 'Tráfico', 'Audio y Video', 'Digital', 'Corrección', 'Cuentas (Cierre)', 'Administración'].map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-3 pt-6 pl-4">
                       <input type="checkbox" name="isLeader" id="isLeader" className="w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                       <label htmlFor="isLeader" className="text-[10px] font-black text-slate-600 uppercase">Es Líder</label>
                    </div>
                 </div>
                 <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setIsUserModalOpen(false)} className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-100">Cancelar</button>
                    <button type="submit" className="flex-1 py-4 bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-teal-600 shadow-xl">Guardar Usuario</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }
      `}</style>
    </div>
  );
}

function MenuBtn({ active, icon, label, onClick }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-[24px] transition-all ${active ? 'bg-slate-800 text-white font-black shadow-xl' : 'text-slate-400 hover:bg-slate-100 hover:text-teal-600'}`}>
      {icon} <span className="text-[13px] font-bold">{label}</span>
    </button>
  );
}

function StatCard({ label, value, color, icon }: any) {
  return (
    <div className="bg-white border border-slate-200 p-8 rounded-[40px] flex items-center justify-between group hover:border-teal-200 transition-all">
      <div><p className="text-[10px] font-black text-slate-400 uppercase mb-2 italic">{label}</p><p className="text-4xl font-black italic tracking-tighter" style={{ color }}>{value}</p></div>
      <div className="p-4 rounded-2xl bg-slate-50" style={{ color }}>{icon}</div>
    </div>
  );
}

function Input({ label, ...props }: any) {
  return (
    <div className="w-full">
      <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 pl-4">{label}</label>
      <input {...props} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 outline-none shadow-sm" />
    </div>
  );
}
