
import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";
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
  CloudOff
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

// --- Configuración de Colores Corporativos ---
const COLORS = {
  pink: '#f24495',
  teal: '#3f8284',
  bg: '#f8fafc',
  white: '#ffffff',
  text: '#1e293b',
  border: '#e2e8f0',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
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
  | 'Administración';

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
  assignedTo?: string; 
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

interface Project {
  id: string;
  empresa: string;
  marca: string;
  producto: string;
  tipo: string;
  materiales: string;
  etapa_actual: string;
  status: 'Normal' | 'Urgente' | 'Vencido' | 'Cancelado' | 'Finalizado';
  motivo_cancelacion?: string;
  fecha_inicio: string;
  fecha_entrega_final: string;
  fecha_entrega_real?: string;
  costo_estimado: number;
  pagado: boolean;
  correccion_ok: boolean;
  correccion_notas: string;
  comentarios: ProjectComment[];
  enlaces: ProjectLink[];
  historial: any[];
  areas_seleccionadas: string[];
  asignaciones: Assignment[];
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

export default function App() {
  // --- Estados ---
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(USERS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('apc_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [view, setView] = useState<'dashboard' | 'proyectos' | 'correccion' | 'historico' | 'reportes' | 'usuarios'>('dashboard');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  
  // Inputs de detalle
  const [newComment, setNewComment] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkDesc, setNewLinkDesc] = useState('');

  // --- Sincronización (Local vs Cloud) ---
  const syncProjects = (newData: Project[]) => {
    if (isCloudEnabled && db) {
      set(ref(db, 'projects'), newData);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    }
    setProjects(newData); // Optimistic update
  };

  const syncUsers = (newData: User[]) => {
    if (isCloudEnabled && db) {
      set(ref(db, 'users'), newData);
    } else {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(newData));
    }
    setUsers(newData);
  };

  // --- Listeners de Firebase ---
  useEffect(() => {
    if (isCloudEnabled && db) {
      // Escuchar cambios en Proyectos
      const unsubProjects = onValue(ref(db, 'projects'), (snapshot) => {
        const data = snapshot.val();
        if (data) setProjects(data);
      });

      // Escuchar cambios en Usuarios
      const unsubUsers = onValue(ref(db, 'users'), (snapshot) => {
        const data = snapshot.val();
        if (data) setUsers(data);
      });

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
    const user = users.find(u => u.username === loginForm.username && u.password === loginForm.password);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('apc_session', JSON.stringify(user));
    } else {
      alert("Acceso denegado.");
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
    'Cuentas', ...p.areas_seleccionadas, 'Corrección', 'Cuentas (Cierre)', 'Administración'
  ];

  const handleCreateODT = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedAreas.length === 0) return alert("Selecciona áreas.");
    const formData = new FormData(e.currentTarget);
    
    const newODT: Project = {
      id: `ODT-${Math.floor(Math.random() * 9000) + 1000}`,
      empresa: formData.get('empresa') as string,
      marca: formData.get('marca') as string,
      producto: formData.get('producto') as string,
      tipo: formData.get('tipo') as string,
      materiales: formData.get('materiales') as string,
      etapa_actual: 'Cuentas',
      status: 'Normal',
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_entrega_final: formData.get('fecha') as string,
      costo_estimado: parseInt(formData.get('costo') as string) || 0,
      pagado: false,
      correccion_ok: false,
      correccion_notas: '',
      comentarios: [],
      enlaces: [],
      areas_seleccionadas: selectedAreas,
      asignaciones: selectedAreas.map(area => ({ area })),
      historial: [{ action: "ODT Creada", user: currentUser?.name, timestamp: new Date().toLocaleString() }]
    };

    syncProjects([newODT, ...projects]);
    setIsModalOpen(false);
    setSelectedAreas([]);
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
    syncProjects(projects.map(p => p.id === selectedProject.id ? { ...p, comentarios: [comment, ...p.comentarios] } : p));
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
    syncProjects(projects.map(p => p.id === selectedProject.id ? { ...p, enlaces: [link, ...p.enlaces] } : p));
    setNewLinkUrl('');
    setNewLinkDesc('');
  };

  const handleAvanzar = (id: string) => {
    const project = projects.find(p => p.id === id);
    if (!project) return;
    if (project.areas_seleccionadas.includes(project.etapa_actual) && !project.correccion_ok) {
      alert("⚠️ BLOQUEO ISO: Se requiere el Visto Bueno de Corrección.");
      return;
    }
    syncProjects(projects.map(p => {
      if (p.id === id) {
        const flow = getProjectFlow(p);
        const idx = flow.indexOf(p.etapa_actual);
        const next = flow[idx + 1];
        if (!next) return { ...p, etapa_actual: 'Finalizado', status: 'Finalizado' };
        return { ...p, etapa_actual: next, correccion_ok: false };
      }
      return p;
    }));
    setSelectedProject(null);
  };

  const handleQA = (id: string, ok: boolean, notes: string) => {
    syncProjects(projects.map(p => p.id === id ? { ...p, correccion_ok: ok, correccion_notas: notes } : p));
    setSelectedProject(null);
  };

  const productionAreas = ['Creativos', 'Médicos', 'Diseño', 'Tráfico', 'Audio y Video', 'Digital'];

  // Sincronizar selectedProject con el estado global de projects (para updates en tiempo real)
  const activeProject = selectedProject ? projects.find(p => p.id === selectedProject.id) : null;

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-6 relative overflow-hidden font-sans">
        <div className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-full border border-slate-700">
          {isCloudEnabled ? <Cloud size={14} className="text-green-400"/> : <CloudOff size={14} className="text-slate-500"/>}
          <span className={`text-[10px] font-black uppercase tracking-widest ${isCloudEnabled ? 'text-green-400' : 'text-slate-500'}`}>
            {isCloudEnabled ? 'Sincronizado' : 'Modo Local'}
          </span>
        </div>
        <form onSubmit={handleLogin} className="w-full max-w-md bg-white rounded-[40px] p-12 shadow-2xl relative z-10">
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-white font-black text-2xl" style={{ background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.pink})` }}>APC</div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Portal ODT v11</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-2 italic text-center">Gestión Certificada ISO 9001:2015</p>
          </div>
          <div className="space-y-6">
            <input type="text" value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-900 outline-none" placeholder="Usuario" required />
            <input type="password" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-900 outline-none" placeholder="Contraseña" required />
            <button type="submit" className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl uppercase text-xs">Acceder</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl italic text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.pink})` }}>APC</div>
          <div><h1 className="font-bold text-lg leading-none" style={{ color: COLORS.teal }}>Publicidad</h1><p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 font-bold italic">SISTEMA ISO</p></div>
        </div>
        <nav className="space-y-1 flex-1">
          <MenuBtn active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<LayoutDashboard size={18}/>} label="Dashboard" />
          <MenuBtn active={view === 'proyectos'} onClick={() => setView('proyectos')} icon={<Briefcase size={18}/>} label="Bandeja ODT" />
          {['Admin', 'Corrección'].includes(currentUser.role) && <MenuBtn active={view === 'correccion'} onClick={() => setView('correccion')} icon={<ShieldCheck size={18}/>} label="Aduana QA" />}
          <MenuBtn active={view === 'historico'} onClick={() => setView('historico')} icon={<History size={18}/>} label="Archivo" />
          {currentUser.role === 'Admin' && <MenuBtn active={view === 'usuarios'} onClick={() => setView('usuarios')} icon={<UsersIcon size={18}/>} label="Usuarios" />}
        </nav>
        <div className="mt-auto flex flex-col gap-4">
           {/* Indicador de Estado de Conexión */}
           <div className={`px-4 py-3 rounded-xl border flex items-center gap-3 ${isCloudEnabled ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
              {isCloudEnabled ? <Cloud size={16}/> : <CloudOff size={16}/>}
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest">{isCloudEnabled ? 'ONLINE' : 'OFFLINE'}</p>
                <p className="text-[9px] opacity-70">{isCloudEnabled ? 'Sync en tiempo real' : 'Solo local'}</p>
              </div>
           </div>
           <button onClick={handleLogout} className="py-4 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase flex items-center justify-center gap-2"><LogOut size={12}/> Cerrar Sesión</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{view}</h2>
          {['Admin', 'Cuentas'].includes(currentUser.role) && view !== 'usuarios' && <button onClick={() => setIsModalOpen(true)} className="h-11 px-6 bg-teal-600 text-white font-black text-xs rounded-xl shadow-lg">+ NUEVA ODT</button>}
          {view === 'usuarios' && <button onClick={() => setIsUserModalOpen(true)} className="h-11 px-6 bg-slate-900 text-white font-black text-xs rounded-xl shadow-lg flex items-center gap-2"><UserPlus size={16}/> NUEVO USUARIO</button>}
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {view === 'dashboard' ? (
             <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in">
                <StatCard label="ODTs Activas" value={projects.filter(p => !['Finalizado', 'Cancelado'].includes(p.status)).length} color={COLORS.teal} icon={<Layers size={20}/>} />
                <StatCard label="QA Pendiente" value={projects.filter(p => !p.correccion_ok && !['Finalizado', 'Cancelado'].includes(p.status)).length} color={COLORS.warning} icon={<ShieldCheck size={20}/>} />
                <StatCard label="Terminadas" value={projects.filter(p => p.status === 'Finalizado').length} color={COLORS.success} icon={<CheckCircle2 size={20}/>} />
                <StatCard label="Usuarios" value={users.length} color={COLORS.info} icon={<UsersIcon size={20}/>} />
             </div>
          ) : view === 'usuarios' && currentUser.role === 'Admin' ? (
            <div className="animate-in fade-in">
               <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                     <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                           <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Nombre</th>
                           <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Usuario</th>
                           <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Rol / Área</th>
                           <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest">Nivel</th>
                           <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Acción</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {users.map(u => (
                          <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                             <td className="px-8 py-5 font-black text-slate-800 text-sm">{u.name}</td>
                             <td className="px-8 py-5 font-mono text-[10px] text-slate-500 font-bold">{u.username}</td>
                             <td className="px-8 py-5"><span className="px-3 py-1 bg-teal-50 text-teal-700 rounded-lg text-[9px] font-black uppercase border border-teal-100">{u.role}</span></td>
                             <td className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">{u.isLeader ? 'Líder' : 'Operativo'}</td>
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
               {projects.filter(p => !['Finalizado', 'Cancelado'].includes(p.status)).map(p => (
                 <div key={p.id} onClick={() => setSelectedProject(p)} className="bg-white border border-slate-200 rounded-[32px] p-6 flex items-center justify-between hover:shadow-lg transition-all cursor-pointer">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center justify-center font-black text-slate-400">
                         <span className="text-[8px] opacity-40 uppercase tracking-widest">ODT</span>{p.id.split('-').pop()}
                      </div>
                      <div><h4 className="font-black text-lg text-slate-800">{p.empresa}</h4><p className="text-[11px] text-slate-500 font-bold uppercase">{p.marca} — {p.producto}</p></div>
                    </div>
                    <div className="text-right">
                       <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Status Actual</p>
                       <p className="font-black text-teal-700 uppercase tracking-tighter text-xl">{p.etapa_actual}</p>
                    </div>
                 </div>
               ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-300 font-black text-xs uppercase tracking-[0.4em]">Sección no disponible en Demo</div>
          )}
        </div>
      </main>

      {/* Modal Detalle ODT ISO 9001 - Full Collaboration */}
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
                 {/* Columna Izquierda: Acción y Auditoría */}
                 <div className="flex-1 flex flex-col bg-slate-50/20 border-r border-slate-100 overflow-y-auto custom-scrollbar p-8 space-y-10">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {/* Control de Calidad */}
                       {currentUser.role === 'Corrección' && (
                          <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-xl">
                             <h3 className="text-[10px] font-black uppercase text-teal-400 mb-6 tracking-widest flex items-center gap-2"><ShieldCheck size={18}/> Aduana QA</h3>
                             <textarea 
                                className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-sm text-white outline-none mb-6 min-h-[80px]"
                                placeholder="Notas de validación..."
                                value={activeProject.correccion_notas}
                                onChange={(e) => syncProjects(projects.map(p => p.id === activeProject.id ? { ...p, correccion_notas: e.target.value } : p))}
                             />
                             <div className="flex gap-4">
                                <button onClick={() => handleQA(activeProject.id, true, activeProject.correccion_notas)} className="flex-1 py-4 bg-teal-600 rounded-2xl font-black text-[10px] uppercase">APROBAR QA ✓</button>
                                <button onClick={() => handleQA(activeProject.id, false, activeProject.correccion_notas)} className="flex-1 py-4 bg-red-600/50 rounded-2xl font-black text-[10px] uppercase">RECHAZAR</button>
                             </div>
                          </div>
                       )}

                       {/* Avance de ODT */}
                       {(activeProject.etapa_actual === currentUser.role || currentUser.role === 'Admin') && (
                          <div className="bg-teal-600 p-8 rounded-[40px] text-white flex flex-col justify-between shadow-xl">
                            <h4 className="text-xl font-black italic">¿Material terminado en {activeProject.etapa_actual}?</h4>
                            <button onClick={() => handleAvanzar(activeProject.id)} className="mt-4 w-full py-5 bg-slate-900 rounded-3xl font-black text-[10px] uppercase shadow-xl flex items-center justify-center gap-3">ENVIAR A SIGUIENTE <ArrowRight size={16}/></button>
                          </div>
                       )}
                    </div>

                    {/* MURO DE COMENTARIOS (Timeline) */}
                    <div className="space-y-6">
                       <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><MessageSquare size={16} className="text-teal-600"/> Muro de Colaboración Interna</h4>
                       <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                          <div className="flex gap-4">
                             <textarea 
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                                className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm text-slate-900 outline-none"
                                placeholder="Escribir nota para el equipo..."
                             />
                             <button onClick={handleAddComment} className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center hover:bg-teal-600 transition-all"><Send size={20}/></button>
                          </div>
                          <div className="space-y-4 mt-6">
                             {activeProject.comentarios.map(c => (
                               <div key={c.id} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 relative group">
                                  <div className="flex justify-between mb-2">
                                     <span className="text-[10px] font-black text-slate-800 uppercase">{c.user} <span className="text-teal-600 ml-2 font-bold opacity-70">({c.role})</span></span>
                                     <span className="text-[8px] font-mono text-slate-400 italic">{c.timestamp}</span>
                                  </div>
                                  <p className="text-sm text-slate-600 leading-relaxed font-medium">{c.text}</p>
                               </div>
                             ))}
                             {activeProject.comentarios.length === 0 && <p className="text-center text-[10px] text-slate-300 font-bold uppercase italic py-4">No hay comentarios registrados.</p>}
                          </div>
                       </div>
                    </div>

                    {/* ENLACES DE MATERIALES (Evidencia ISO) */}
                    <div className="space-y-6">
                       <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><Paperclip size={16} className="text-teal-600"/> Evidencias y Materiales de Producción</h4>
                       <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <input type="text" value={newLinkUrl} onChange={e => setNewLinkUrl(e.target.value)} placeholder="URL del material (Drive/Wetransfer...)" className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs text-slate-900 outline-none font-bold" />
                             <div className="flex gap-4">
                                <input type="text" value={newLinkDesc} onChange={e => setNewLinkDesc(e.target.value)} placeholder="Descripción breve" className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs text-slate-900 outline-none font-bold" />
                                <button onClick={handleAddLink} className="px-6 bg-teal-600 text-white rounded-2xl font-black text-[10px] uppercase">CARGAR</button>
                             </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             {activeProject.enlaces.map(l => (
                               <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-teal-400 transition-all">
                                  <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-teal-600"><LinkIcon size={16}/></div>
                                     <div className="flex flex-col"><span className="text-xs font-black text-slate-800 truncate max-w-[140px]">{l.description}</span><span className="text-[8px] text-slate-400 uppercase font-bold">Por: {l.user}</span></div>
                                  </div>
                                  <ExternalLink size={14} className="text-slate-300 group-hover:text-teal-600"/>
                               </a>
                             ))}
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Columna Derecha: Ruta ISO */}
                 <div className="w-96 p-8 space-y-12 bg-white overflow-y-auto border-l border-slate-100">
                    <h3 className="text-[10px] font-black uppercase text-slate-400 mb-10 tracking-[0.4em] flex items-center gap-3 font-bold"><Clock size={16} className="text-teal-600"/> Hoja de Ruta ISO</h3>
                    <div className="space-y-8 pl-4 relative">
                       <div className="absolute left-[25px] top-2 bottom-2 w-px bg-slate-100"></div>
                       {getProjectFlow(activeProject).map((d, idx) => {
                          const currentIdx = getProjectFlow(activeProject).indexOf(activeProject.etapa_actual);
                          const isDone = idx < currentIdx;
                          const isCurrent = idx === currentIdx;
                          return (
                            <div key={d} className={`flex items-start gap-6 relative z-10 transition-all duration-500 ${idx > currentIdx + 1 ? 'opacity-20' : 'opacity-100'}`}>
                               <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${isDone ? 'bg-green-500 shadow-lg' : isCurrent ? 'bg-teal-600 scale-125 shadow-xl' : 'bg-white border-2 border-slate-100'}`}>{isDone ? <CheckCircle2 size={16} className="text-white"/> : null}</div>
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

      {/* Modal Nueva ODT */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xl z-[200] flex items-center justify-center p-6 animate-in zoom-in duration-300">
          <div className="w-full max-w-4xl bg-white rounded-[60px] shadow-2xl p-14 border border-slate-200 overflow-y-auto max-h-[90vh]">
             <div className="flex justify-between items-center mb-10">
                <h3 className="text-4xl font-black italic text-slate-900 uppercase tracking-tighter leading-none">Nueva ODT</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-2xl">✕</button>
             </div>
             <form onSubmit={handleCreateODT} className="grid grid-cols-1 lg:grid-cols-2 gap-14">
                <div className="space-y-6">
                   <Input label="Laboratorio" name="empresa" required placeholder="Ej: Bayer" />
                   <Input label="Marca" name="marca" required placeholder="Ej: Aspirina" />
                   <Input label="Campaña" name="producto" required placeholder="Lanzamiento Q3" />
                   <div className="grid grid-cols-2 gap-4">
                      <select name="tipo" className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-black text-slate-900 uppercase outline-none"><option>Digital</option><option>Impreso</option></select>
                      <input type="date" name="fecha" required className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-black text-slate-900 outline-none" />
                   </div>
                   <textarea name="materiales" required className="w-full bg-slate-50 border border-slate-100 rounded-3xl p-6 text-sm text-slate-900 outline-none min-h-[120px]" placeholder="Brief detallado..."></textarea>
                </div>
                <div className="space-y-8">
                   <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Áreas Participantes</h4>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {productionAreas.map(area => (
                        <div 
                          key={area} 
                          onClick={() => setSelectedAreas(prev => prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area])}
                          className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${selectedAreas.includes(area) ? 'bg-teal-600 border-teal-600 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-400'}`}
                        >
                           <span className="text-[10px] font-black uppercase">{area}</span>
                           {selectedAreas.includes(area) ? <CheckCircle2 size={16}/> : <Plus size={16}/>}
                        </div>
                      ))}
                   </div>
                   <button type="submit" className="w-full py-8 bg-slate-900 text-white font-black rounded-[32px] uppercase shadow-2xl hover:bg-teal-700 transition-all">ACTIVAR PROCESO</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Modal Nuevo Usuario (Solo Admin) */}
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
                    <button type="submit" className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-teal-600 shadow-xl">Guardar Usuario</button>
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
    <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-[24px] transition-all ${active ? 'bg-slate-900 text-white font-black shadow-xl' : 'text-slate-400 hover:bg-slate-50 hover:text-teal-600'}`}>
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
