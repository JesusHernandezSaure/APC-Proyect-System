
import React, { useState, useEffect, useMemo } from 'react';
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
  SpellCheck,
  FileText,
  MousePointer2,
  Lock,
  LogOut,
  Download,
  Filter,
  AlertTriangle,
  Users as UsersIcon,
  UserPlus
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';

// --- Configuración Visual ---
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

// --- Tipos y Estructuras ---
type UserRole = 'Admin' | 'Cuentas' | 'Creativos' | 'Médicos' | 'Diseño' | 'Tráfico' | 'Audio y Video' | 'Digital' | 'Corrección' | 'Cuentas (Cierre)' | 'Administración';

interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  isLeader: boolean;
  password?: string; // En una app real esto iría encriptado en el backend
}

interface Assignment {
  area: string;
  assignedTo?: string; // ID del usuario
  assignedAt?: string;
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
  comentarios: any[];
  enlaces: any[];
  historial: any[];
  areas_seleccionadas: string[];
  asignaciones: Assignment[];
}

const STORAGE_KEY = 'apc_pro_v8_iso_compliant';
const USERS_STORAGE_KEY = 'apc_users_v1';

// Usuarios semilla
const INITIAL_USERS: User[] = [
  { id: '1', username: 'admin', name: 'Administrador Sistema', role: 'Admin', isLeader: true, password: 'admin' },
  { id: '2', username: 'ana.cuentas', name: 'Ana Lopez', role: 'Cuentas', isLeader: true, password: '123' },
  { id: '3', username: 'pedro.diseno', name: 'Pedro Marmol (Líder)', role: 'Diseño', isLeader: true, password: '123' },
  { id: '4', username: 'juan.diseno', name: 'Juan Perez', role: 'Diseño', isLeader: false, password: '123' },
  { id: '5', username: 'marta.correccion', name: 'Marta Ruiz', role: 'Corrección', isLeader: true, password: '123' },
];

export default function App() {
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(USERS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('apc_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [view, setView] = useState<'dashboard' | 'proyectos' | 'correccion' | 'historico' | 'reportes' | 'usuarios'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(projects)); }, [projects]);
  useEffect(() => { localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users)); }, [users]);

  // --- Lógica de Autenticación ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.username === loginForm.username && u.password === loginForm.password);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('apc_session', JSON.stringify(user));
    } else {
      alert("Credenciales incorrectas.");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('apc_session');
  };

  // --- Gestión de Usuarios (Admin) ---
  const handleCreateUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newUser: User = {
      id: Date.now().toString(),
      username: formData.get('username') as string,
      name: formData.get('name') as string,
      role: formData.get('role') as UserRole,
      isLeader: formData.get('isLeader') === 'on',
      password: (formData.get('password') as string) || '123'
    };

    if (users.find(u => u.username === newUser.username)) {
      alert("El nombre de usuario ya existe.");
      return;
    }

    setUsers(prev => [...prev, newUser]);
    setIsUserModalOpen(false);
  };

  const deleteUser = (id: string) => {
    if (id === currentUser?.id) return alert("No puedes eliminarte a ti mismo.");
    if (confirm("¿Eliminar este usuario?")) {
      setUsers(prev => prev.filter(u => u.id !== id));
    }
  };

  // --- Lógica de Negocio ODT ---
  const getProjectFlow = (p: Project) => [
    'Cuentas', ...p.areas_seleccionadas, 'Corrección', 'Cuentas (Cierre)', 'Administración'
  ];

  const handleCreateODT = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedAreas.length === 0) return alert("Selecciona áreas");
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
      historial: [{ action: "ODT Iniciada", user: currentUser?.name, timestamp: new Date().toLocaleString() }]
    };

    setProjects(prev => [newODT, ...prev]);
    setIsModalOpen(false);
    setSelectedAreas([]);
  };

  const handleAssign = (projectId: string, area: string, userId: string) => {
    const userName = users.find(u => u.id === userId)?.name;
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          asignaciones: p.asignaciones.map(a => a.area === area ? { ...a, assignedTo: userId, assignedAt: new Date().toLocaleString() } : a),
          historial: [{ action: `Asignado a ${userName} (${area})`, user: currentUser?.name, timestamp: new Date().toLocaleString() }, ...p.historial]
        };
      }
      return p;
    }));
    if (selectedProject?.id === projectId) {
      setSelectedProject(prev => prev ? ({
        ...prev,
        asignaciones: prev.asignaciones.map(a => a.area === area ? { ...a, assignedTo: userId, assignedAt: new Date().toLocaleString() } : a)
      }) : null);
    }
  };

  const handleCancelODT = () => {
    if (!selectedProject || !cancelReason.trim()) return;
    setProjects(prev => prev.map(p => p.id === selectedProject.id ? { 
      ...p, 
      status: 'Cancelado', 
      motivo_cancelacion: cancelReason,
      historial: [{ action: `CANCELADO: ${cancelReason}`, user: currentUser?.name, timestamp: new Date().toLocaleString() }, ...p.historial]
    } : p));
    setIsCancelModalOpen(false);
    setSelectedProject(null);
    setCancelReason('');
  };

  const exportData = () => {
    const headers = ["ID", "Empresa", "Marca", "Producto", "Status", "Etapa", "Fecha Inicio", "Entrega Final", "Costo", "Cancelacion"];
    const rows = projects.map(p => [
      p.id, p.empresa, p.marca, p.producto, p.status, p.etapa_actual, p.fecha_inicio, p.fecha_entrega_final, p.costo_estimado, p.motivo_cancelacion || ""
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `APC_ODT_REPORT_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  const handleAvanzar = (id: string) => {
    const project = projects.find(p => p.id === id);
    if (!project) return;

    if (project.areas_seleccionadas.includes(project.etapa_actual) && !project.correccion_ok) {
      alert("⚠️ BLOQUEO DE CALIDAD: Corrección debe validar antes de avanzar.");
      return;
    }

    setProjects(prev => prev.map(p => {
      if (p.id === id) {
        const flow = getProjectFlow(p);
        const idx = flow.indexOf(p.etapa_actual);
        const next = flow[idx + 1];
        if (!next) {
            return { ...p, etapa_actual: 'Finalizado', status: 'Finalizado', fecha_entrega_real: new Date().toLocaleString() };
        }
        return { 
            ...p, 
            etapa_actual: next, 
            correccion_ok: false,
            historial: [{ action: `Avanzó a ${next}`, user: currentUser?.name, timestamp: new Date().toLocaleString() }, ...p.historial]
        };
      }
      return p;
    }));
    setSelectedProject(null);
  };

  // Pantalla de Login
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0f18] p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-pink-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        
        <form onSubmit={handleLogin} className="w-full max-w-md bg-white rounded-[40px] p-12 shadow-2xl relative z-10 border border-white/20">
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-white font-black text-2xl shadow-xl" style={{ background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.pink})` }}>APC</div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Portal ODT</h1>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2 italic">Certificación ISO 9001:2015</p>
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 pl-4 tracking-widest">Nombre de Usuario</label>
              <div className="relative">
                <input type="text" value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-teal-500/10 transition-all" placeholder="Ej: admin" required />
                <UserCheck className="absolute right-4 top-4 text-slate-300" size={20} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 pl-4 tracking-widest">Contraseña</label>
              <div className="relative">
                <input type="password" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-4 focus:ring-teal-500/10 transition-all" placeholder="••••••••" required />
                <Lock className="absolute right-4 top-4 text-slate-300" size={20} />
              </div>
            </div>
            <button type="submit" className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-teal-700 hover:-translate-y-1 transition-all active:scale-95 uppercase tracking-widest text-xs">Ingresar al Sistema</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar Corporativo */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl italic text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.pink})` }}>APC</div>
          <div><h1 className="font-bold text-lg leading-none" style={{ color: COLORS.teal }}>Publicidad</h1><p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1 font-bold italic">ISO CONTROL</p></div>
        </div>
        
        <nav className="space-y-1 flex-1 overflow-y-auto custom-scrollbar">
          <MenuBtn active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<LayoutDashboard size={18}/>} label="Dashboard" />
          <MenuBtn active={view === 'proyectos'} onClick={() => setView('proyectos')} icon={<Briefcase size={18}/>} label="Bandeja ODT" />
          {['Admin', 'Corrección'].includes(currentUser.role) && <MenuBtn active={view === 'correccion'} onClick={() => setView('correccion')} icon={<ShieldCheck size={18}/>} label="Corrección" />}
          <MenuBtn active={view === 'historico'} onClick={() => setView('historico')} icon={<History size={18}/>} label="Histórico ISO" />
          <MenuBtn active={view === 'reportes'} onClick={() => setView('reportes')} icon={<FileBarChart size={18}/>} label="Métricas" />
          {currentUser.role === 'Admin' && <MenuBtn active={view === 'usuarios'} onClick={() => setView('usuarios')} icon={<UsersIcon size={18}/>} label="Usuarios" />}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-100">
          <div className="bg-slate-900 rounded-3xl p-5 text-white shadow-xl mb-4">
             <div className="flex items-center gap-3 mb-3">
               <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-teal-400 font-bold">{currentUser.name.charAt(0)}</div>
               <div className="min-w-0">
                 <p className="text-xs font-black truncate">{currentUser.name}</p>
                 <p className="text-[9px] uppercase font-bold text-teal-400">{currentUser.role} {currentUser.isLeader ? '(LÍDER)' : '(OP)'}</p>
               </div>
             </div>
             <button onClick={handleLogout} className="w-full py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all"><LogOut size={12}/> Cerrar Sesión</button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">{view.toUpperCase()}</h2>
            <div className="flex items-center gap-2 px-4 py-1.5 bg-teal-50 text-teal-600 rounded-full text-[10px] font-black uppercase border border-teal-100">
               <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></div> {currentUser.role} ACTIVO
            </div>
          </div>
          <div className="flex items-center gap-4">
            {['Admin', 'Cuentas'].includes(currentUser.role) && <button onClick={() => setIsModalOpen(true)} className="h-11 px-6 bg-teal-600 text-white font-black text-xs rounded-xl shadow-lg hover:scale-105 transition-all">+ NUEVA ODT</button>}
            <button onClick={exportData} className="h-11 px-6 bg-slate-900 text-white font-black text-xs rounded-xl flex items-center gap-2 hover:bg-slate-800 transition-all"><Download size={14}/> EXPORTAR</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {view === 'dashboard' ? (
            <div className="space-y-8 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard label="ODTs Activas" value={projects.filter(p => !['Finalizado', 'Cancelado'].includes(p.status)).length} color={COLORS.teal} icon={<Layers size={20}/>} />
                <StatCard label="A tiempo" value={projects.filter(p => p.status === 'Normal').length} color={COLORS.success} icon={<CheckSquare size={20}/>} />
                <StatCard label="Urgentes" value={projects.filter(p => p.status === 'Urgente').length} color={COLORS.warning} icon={<AlertTriangle size={20}/>} />
                <StatCard label="Histórico" value={projects.filter(p => ['Finalizado', 'Cancelado'].includes(p.status)).length} color={COLORS.info} icon={<History size={20}/>} />
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 {/* Mis Tareas (Para Operativos y Líderes) */}
                 <div className="bg-white border border-slate-200 p-8 rounded-[40px] shadow-sm">
                    <h3 className="text-xs font-black uppercase text-slate-400 mb-6 flex items-center gap-2 tracking-widest"><ClipboardCheck size={18}/> Mis Tareas Asignadas</h3>
                    <div className="space-y-3">
                       {projects.filter(p => p.asignaciones.find(a => a.assignedTo === currentUser.id && a.area === p.etapa_actual)).map(p => (
                         <div key={p.id} onClick={() => setSelectedProject(p)} className="p-5 bg-slate-50 border border-slate-100 rounded-3xl hover:border-teal-400 transition-all cursor-pointer flex justify-between items-center group">
                            <div><p className="text-[10px] font-black text-teal-600 uppercase">{p.id}</p><h4 className="font-black text-slate-800">{p.empresa} - {p.marca}</h4></div>
                            <div className="p-3 bg-white rounded-xl text-slate-300 group-hover:text-teal-600 transition-all"><ArrowRight size={18}/></div>
                         </div>
                       ))}
                       {projects.filter(p => p.asignaciones.find(a => a.assignedTo === currentUser.id && a.area === p.etapa_actual)).length === 0 && (
                         <p className="text-slate-300 text-xs italic p-4 text-center border-2 border-dashed border-slate-100 rounded-2xl">No tienes tareas asignadas actualmente.</p>
                       )}
                    </div>
                 </div>

                 {/* Bandeja de Asignación (Solo para Líderes de área) */}
                 {currentUser.isLeader && currentUser.role !== 'Admin' && (
                   <div className="bg-teal-50/50 border-2 border-dashed border-teal-200 p-8 rounded-[40px]">
                      <h3 className="text-xs font-black uppercase text-teal-600 mb-6 flex items-center gap-2 tracking-widest"><Inbox size={18}/> Asignación Pendiente ({currentUser.role})</h3>
                      <div className="space-y-3">
                         {projects.filter(p => p.areas_seleccionadas.includes(currentUser.role) && !p.asignaciones.find(a => a.area === currentUser.role)?.assignedTo).map(p => (
                           <div key={p.id} onClick={() => setSelectedProject(p)} className="bg-white p-5 rounded-3xl border border-teal-100 flex items-center justify-between hover:scale-102 transition-all cursor-pointer shadow-sm group">
                              <div><p className="text-[10px] font-black text-teal-600">{p.id}</p><h4 className="font-black text-slate-800">{p.empresa}</h4></div>
                              <button className="px-4 py-2 bg-teal-600 text-white text-[10px] font-black rounded-xl hover:bg-teal-700">ASIGNAR</button>
                           </div>
                         ))}
                         {projects.filter(p => p.areas_seleccionadas.includes(currentUser.role) && !p.asignaciones.find(a => a.area === currentUser.role)?.assignedTo).length === 0 && (
                           <p className="text-teal-400 text-xs italic font-bold text-center">Todo tu equipo tiene tareas asignadas.</p>
                         )}
                      </div>
                   </div>
                 )}
              </div>
            </div>
          ) : view === 'usuarios' ? (
            <div className="space-y-8 animate-in slide-in-from-bottom-4">
               <div className="flex items-center justify-between">
                  <h2 className="text-4xl font-black italic tracking-tighter text-slate-800 uppercase leading-none">Gestión de Usuarios</h2>
                  <button onClick={() => setIsUserModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase hover:bg-teal-600 transition-all shadow-xl"><UserPlus size={18}/> Nuevo Usuario</button>
               </div>
               <div className="bg-white border border-slate-200 rounded-[40px] overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                     <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                           <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Nombre</th>
                           <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Usuario</th>
                           <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Departamento</th>
                           <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Rango</th>
                           <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Acciones</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {users.map(u => (
                          <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                             <td className="px-8 py-5 font-black text-slate-700">{u.name}</td>
                             <td className="px-8 py-5 font-mono text-xs text-slate-400">{u.username}</td>
                             <td className="px-8 py-5"><span className="px-3 py-1 bg-teal-50 text-teal-600 rounded-lg text-[10px] font-black uppercase">{u.role}</span></td>
                             <td className="px-8 py-5 font-bold text-xs">{u.isLeader ? 'LÍDER' : 'OPERATIVO'}</td>
                             <td className="px-8 py-5 text-right">
                                <button onClick={() => deleteUser(u.id)} className="p-2 text-slate-200 hover:text-red-500 transition-all"><Trash2 size={16}/></button>
                             </td>
                          </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          ) : view === 'historico' ? (
             <div className="space-y-6 animate-in slide-in-from-bottom-4">
                <div className="flex items-center justify-between">
                   <h2 className="text-4xl font-black italic tracking-tighter text-slate-800 uppercase leading-none">Histórico ISO</h2>
                   <div className="relative w-72"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" placeholder="ID o Marca..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 text-xs font-bold outline-none" /></div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                   {projects.filter(p => ['Finalizado', 'Cancelado'].includes(p.status)).map(p => (
                     <div key={p.id} onClick={() => setSelectedProject(p)} className="bg-white border border-slate-200 rounded-[32px] p-6 flex items-center justify-between hover:shadow-lg transition-all cursor-pointer group">
                        <div className="flex items-center gap-6">
                           <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black ${p.status === 'Cancelado' ? 'bg-red-50 text-red-400' : 'bg-green-50 text-green-600'}`}>
                             {p.status === 'Cancelado' ? <X size={24}/> : <CheckCircle2 size={24}/>}
                           </div>
                           <div><h4 className="font-black text-lg text-slate-800">{p.empresa} - {p.marca}</h4><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{p.status === 'Cancelado' ? `MOTIVO: ${p.motivo_cancelacion}` : `Finalizado: ${p.fecha_entrega_real}`}</p></div>
                        </div>
                        <p className={`font-black text-sm uppercase ${p.status === 'Cancelado' ? 'text-red-500' : 'text-green-600'}`}>{p.status}</p>
                     </div>
                   ))}
                </div>
             </div>
          ) : (
             <div className="space-y-6 animate-in slide-in-from-bottom-4">
                <div className="flex items-center justify-between">
                   <h2 className="text-4xl font-black italic tracking-tighter text-slate-800 uppercase leading-none">Bandeja de Proyectos</h2>
                   <div className="relative w-72"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" placeholder="ID o Marca..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 text-xs font-bold outline-none shadow-sm" /></div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {projects.filter(p => !['Finalizado', 'Cancelado'].includes(p.status) && (p.id.includes(searchTerm) || p.marca.toLowerCase().includes(searchTerm.toLowerCase()))).map(p => (
                    <div key={p.id} onClick={() => setSelectedProject(p)} className="bg-white border border-slate-200 rounded-[32px] p-6 flex items-center justify-between hover:shadow-lg transition-all cursor-pointer shadow-sm relative group">
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center justify-center font-black text-slate-400 group-hover:text-teal-600 transition-all leading-none">
                           <span className="text-[8px] opacity-40 uppercase tracking-widest">ODT</span>{p.id.split('-').pop()}
                        </div>
                        <div><h4 className="font-black text-lg text-slate-800">{p.empresa}</h4><p className="text-xs text-slate-500 font-bold uppercase">{p.marca} • {p.producto}</p></div>
                      </div>
                      <div className="flex items-center gap-10">
                        <div className="text-right">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado</p>
                           <p className="font-black text-teal-700 uppercase tracking-tighter text-xl">{p.etapa_actual}</p>
                        </div>
                        <div className="p-4 bg-slate-900 text-white rounded-2xl group-hover:bg-teal-600 transition-all"><ArrowRight size={24}/></div>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          )}
        </div>
      </main>

      {/* Modal Detalle ODT ISO */}
      {selectedProject && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[150] flex items-center justify-end p-4 lg:p-10 animate-in fade-in duration-300">
          <div className="w-full max-w-6xl bg-white h-full rounded-[60px] shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in slide-in-from-right duration-500">
            <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-20">
              <div className="flex items-center gap-8">
                <div className="px-6 py-3 bg-slate-50 border border-slate-200 shadow-inner rounded-3xl font-black text-teal-600 text-xl tracking-tighter">{selectedProject.id}</div>
                <div><h2 className="text-4xl font-black italic text-slate-800 tracking-tighter uppercase leading-tight">{selectedProject.empresa}</h2><p className="text-xs text-slate-400 font-black tracking-widest uppercase">{selectedProject.marca} — {selectedProject.producto}</p></div>
              </div>
              <div className="flex gap-4">
                 {['Admin', 'Cuentas'].includes(currentUser.role) && !['Finalizado', 'Cancelado'].includes(selectedProject.status) && (
                   <button onClick={() => setIsCancelModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase hover:bg-red-600 hover:text-white transition-all"><AlertTriangle size={14}/> Cancelar ODT</button>
                 )}
                 <button onClick={() => setSelectedProject(null)} className="w-14 h-14 flex items-center justify-center bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-all text-slate-400 shadow-sm active:scale-90 text-2xl">✕</button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
               <div className="flex-1 flex flex-col bg-slate-50/20 border-r border-slate-100 overflow-y-auto custom-scrollbar p-10 space-y-12">
                  
                  {/* Panel de Control Dinámico según Rol */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     {/* Asignación para Líderes */}
                     {currentUser.isLeader && selectedProject.areas_seleccionadas.includes(currentUser.role) && (
                        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                           <h3 className="text-[10px] font-black uppercase text-teal-600 mb-6 tracking-widest flex items-center gap-2"><MousePointer2 size={16}/> Asignación de Recurso</h3>
                           <div className="space-y-4">
                              <select 
                                 onChange={(e) => handleAssign(selectedProject.id, currentUser.role, e.target.value)}
                                 value={selectedProject.asignaciones.find(a => a.area === currentUser.role)?.assignedTo || ''}
                                 className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-xs font-black uppercase outline-none focus:ring-4 focus:ring-teal-500/5"
                              >
                                 <option value="">-- Sin Asignar --</option>
                                 {users.filter(u => u.role === currentUser.role && !u.isLeader).map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                 ))}
                              </select>
                              <p className="text-[9px] text-slate-400 font-bold uppercase pl-2">Solo aparecen usuarios de {currentUser.role} sin cargo de Líder.</p>
                           </div>
                        </div>
                     )}

                     {/* Botón de Avance para Operativos/Líderes que tienen la tarea */}
                     {(selectedProject.etapa_actual === currentUser.role || currentUser.role === 'Admin') && !['Finalizado', 'Cancelado'].includes(selectedProject.status) && (
                        <div className="bg-slate-900 p-8 rounded-[40px] text-white flex flex-col justify-between">
                           <div>
                              <h3 className="text-[10px] font-black uppercase text-teal-400 mb-2 tracking-widest">Control de Etapa</h3>
                              <p className="text-xl font-black italic tracking-tight">Pasar ODT a siguiente fase</p>
                           </div>
                           <button onClick={() => handleAvanzar(selectedProject.id)} className="mt-6 w-full py-4 bg-teal-600 hover:bg-teal-500 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-xl flex items-center justify-center gap-2">ENVIAR A SIGUIENTE <ArrowRight size={16}/></button>
                        </div>
                     )}
                  </div>

                  {/* Historial Auditoría */}
                  <div className="space-y-6">
                    <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 font-bold"><History size={16}/> Bitácora de Auditoría ISO</h4>
                    <div className="space-y-3">
                      {selectedProject.historial.map((h, i) => (
                        <div key={i} className="bg-white p-5 rounded-[28px] border border-slate-100 shadow-sm flex items-center justify-between group">
                           <div className="flex flex-col"><span className="text-[10px] font-black text-slate-800 uppercase leading-none mb-1">{h.action}</span><span className="text-[8px] text-slate-400 font-bold uppercase">Por: {h.user}</span></div>
                           <span className="text-[9px] font-mono text-slate-300 font-black italic">{h.timestamp}</span>
                        </div>
                      ))}
                    </div>
                  </div>
               </div>

               {/* Columna Derecha con Ruta */}
               <div className="w-[450px] p-12 space-y-12 bg-white overflow-y-auto border-l border-slate-100">
                  <div>
                     <h3 className="text-[11px] font-black uppercase text-slate-400 mb-10 tracking-[0.4em] flex items-center gap-3 font-bold"><Clock size={18} className="text-teal-600"/> Seguimiento de Ruta</h3>
                     <div className="space-y-8 pl-6 relative">
                        <div className="absolute left-[33px] top-2 bottom-2 w-0.5 bg-slate-100"></div>
                        {getProjectFlow(selectedProject).map(d => {
                          const flow = getProjectFlow(selectedProject!);
                          const idx = flow.indexOf(d);
                          const currentIdx = flow.indexOf(selectedProject!.etapa_actual);
                          const isDone = idx < currentIdx;
                          const isCurrent = idx === currentIdx;
                          const assigned = selectedProject!.asignaciones.find(a => a.area === d);

                          return (
                            <div key={d} className={`flex items-start gap-8 relative z-10 transition-all duration-500 ${idx > currentIdx + 1 ? 'opacity-20' : 'opacity-100'}`}>
                               <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${isDone ? 'bg-green-500 shadow-lg' : isCurrent ? 'bg-teal-600 scale-125 shadow-2xl' : 'bg-white border-4 border-slate-50 shadow-sm'}`}>{isDone ? <CheckCircle2 size={20} className="text-white"/> : null}</div>
                               <div className="flex flex-col">
                                  <span className={`text-[11px] font-black uppercase tracking-widest ${isCurrent ? 'text-teal-700 font-black' : isDone ? 'text-slate-500' : 'text-slate-300'}`}>{d}</span>
                                  {assigned?.assignedTo && (
                                    <span className="text-[8px] text-slate-400 font-bold uppercase mt-1">Responsable: {users.find(u => u.id === assigned.assignedTo)?.name}</span>
                                  )}
                               </div>
                            </div>
                          );
                        })}
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nueva ODT */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xl z-[200] flex items-center justify-center p-6 animate-in zoom-in duration-300 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-[60px] shadow-2xl p-14 border border-slate-200 my-10 relative">
             <div className="flex justify-between items-center mb-10">
                <h3 className="text-4xl font-black italic text-slate-900 uppercase tracking-tighter leading-none">Nueva ODT</h3>
                <button onClick={() => { setIsModalOpen(false); setSelectedAreas([]); }} className="p-4 hover:bg-slate-50 rounded-full transition-all text-2xl">✕</button>
             </div>
             <form onSubmit={handleCreateODT} className="grid grid-cols-1 lg:grid-cols-2 gap-14">
                <div className="space-y-8">
                   <div className="grid grid-cols-2 gap-8">
                      <Input label="Empresa / Lab" name="empresa" required placeholder="Roche" />
                      <Input label="Marca" name="marca" required placeholder="Centrum" />
                   </div>
                   <Input label="Campaña / Producto" name="producto" required placeholder="Digital Q1" />
                   <div className="grid grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2"><label className="text-[10px] font-black uppercase text-slate-400 pl-4 font-bold">Material</label><select name="tipo" className="bg-slate-50 border border-slate-200 rounded-3xl p-5 text-xs font-black uppercase outline-none"><option>Digital</option><option>Impreso</option><option>Video</option></select></div>
                      <div className="flex flex-col gap-2"><label className="text-[10px] font-black uppercase text-slate-400 pl-4 font-bold">Entrega Final</label><input type="date" name="fecha" required className="bg-slate-50 border border-slate-200 rounded-3xl p-5 text-xs font-black outline-none" /></div>
                   </div>
                   <Input label="Inversión Estimada" name="costo" placeholder="0.00" />
                   <div className="flex flex-col gap-2"><label className="text-[10px] font-black uppercase text-slate-400 pl-4 font-bold tracking-widest">Instrucciones / Brief</label><textarea name="materiales" required className="w-full bg-slate-50 border border-slate-200 rounded-[32px] p-8 text-sm min-h-[140px] outline-none font-medium"></textarea></div>
                </div>
                <div className="space-y-10">
                   <div>
                      <h4 className="text-[11px] font-black uppercase text-slate-400 mb-6 tracking-widest flex items-center gap-2"><MousePointer2 size={16} className="text-teal-600"/> Áreas de Producción</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {['Creativos', 'Médicos', 'Diseño', 'Tráfico', 'Audio y Video', 'Digital'].map(area => (
                          <div 
                            key={area} 
                            onClick={() => setSelectedAreas(prev => prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area])}
                            className={`p-6 rounded-3xl border-2 transition-all cursor-pointer flex items-center justify-between group ${selectedAreas.includes(area) ? 'bg-teal-600 border-teal-600 text-white shadow-xl' : 'bg-white border-slate-100 text-slate-400 hover:border-teal-200'}`}
                          >
                             <span className="text-xs font-black uppercase tracking-tight">{area}</span>
                             {selectedAreas.includes(area) ? <CheckCircle2 size={16}/> : <Plus size={16}/>}
                          </div>
                        ))}
                      </div>
                   </div>
                   <button type="submit" className="w-full py-8 bg-slate-900 text-white font-black rounded-[32px] shadow-2xl uppercase tracking-widest hover:bg-teal-700 hover:-translate-y-1 transition-all">ACTIVAR ODT</button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Modal Nuevo Usuario (Admin) */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xl z-[200] flex items-center justify-center p-6 animate-in zoom-in duration-300">
           <div className="w-full max-w-lg bg-white rounded-[40px] shadow-2xl p-10 border border-slate-200 relative">
              <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-8 text-slate-900">Configurar Acceso</h3>
              <form onSubmit={handleCreateUser} className="space-y-6">
                 <Input label="Nombre Completo" name="name" required placeholder="Ej: Juan Pérez" />
                 <Input label="Usuario (Login)" name="username" required placeholder="Ej: j.perez" />
                 <Input label="Contraseña" name="password" type="password" required placeholder="••••••••" />
                 <div className="grid grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2"><label className="text-[10px] font-black uppercase text-slate-400 pl-4">Rol / Área</label><select name="role" className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold outline-none">
                       {['Cuentas', 'Creativos', 'Médicos', 'Diseño', 'Tráfico', 'Audio y Video', 'Digital', 'Corrección', 'Cuentas (Cierre)', 'Administración'].map(r => <option key={r} value={r}>{r}</option>)}
                    </select></div>
                    <div className="flex items-center gap-3 pt-6 pl-4">
                       <input type="checkbox" name="isLeader" id="isLeader" className="w-5 h-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                       <label htmlFor="isLeader" className="text-xs font-black text-slate-600 uppercase">Es Líder</label>
                    </div>
                 </div>
                 <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setIsUserModalOpen(false)} className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-100 transition-all">Cancelar</button>
                    <button type="submit" className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-teal-600 transition-all shadow-xl">Crear Usuario</button>
                 </div>
              </form>
           </div>
        </div>
      )}

      {/* Modal Cancelación */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 bg-red-900/40 backdrop-blur-md z-[250] flex items-center justify-center p-6 animate-in zoom-in duration-300">
           <div className="w-full max-w-lg bg-white rounded-[40px] shadow-2xl p-10 border border-slate-200">
              <div className="flex items-center gap-4 mb-6 text-red-600">
                 <AlertTriangle size={32}/>
                 <h3 className="text-2xl font-black italic uppercase tracking-tighter">Protocolo de Cancelación</h3>
              </div>
              <textarea 
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Explica el motivo (ISO 9001)..."
                className="w-full bg-slate-50 border border-slate-100 rounded-3xl p-6 text-sm font-medium outline-none min-h-[120px] mb-8"
              />
              <div className="flex gap-4">
                 <button onClick={() => setIsCancelModalOpen(false)} className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-2xl text-[10px] font-black uppercase transition-all">Volver</button>
                 <button onClick={handleCancelODT} className="flex-1 py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-red-700 transition-all shadow-xl">Confirmar</button>
              </div>
           </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 20px; }
      `}</style>
    </div>
  );
}

function MenuBtn({ active, icon, label, onClick }: any) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-[24px] transition-all relative ${active ? 'bg-slate-900 text-white font-black shadow-xl' : 'text-slate-400 hover:bg-slate-50 hover:text-teal-600'}`}>
      {icon} <span className="text-sm font-bold tracking-tight">{label}</span>
      {active && <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-teal-400"></div>}
    </button>
  );
}

function StatCard({ label, value, color, icon }: any) {
  return (
    <div className="bg-white border border-slate-200 p-8 rounded-[40px] shadow-sm flex items-center justify-between group hover:border-teal-200 transition-all overflow-hidden relative active:scale-95">
      <div className="relative z-10"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">{label}</p><p className="text-4xl font-black italic tracking-tighter" style={{ color }}>{value}</p></div>
      <div className="p-4 rounded-2xl bg-slate-50 group-hover:bg-white transition-all relative z-10" style={{ color }}>{icon}</div>
    </div>
  );
}

function Input({ label, ...props }: any) {
  return (
    <div className="w-full">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 pl-4 font-bold tracking-tighter">{label}</label>
      <input {...props} className="w-full bg-slate-50 border border-slate-100 rounded-3xl px-8 py-4 text-sm font-bold outline-none focus:ring-4 focus:ring-teal-500/5 transition-all shadow-sm" />
    </div>
  );
}
