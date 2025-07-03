import React, { useState, useEffect } from 'react';
import { 
  Home, 
  PlusCircle, 
  CreditCard, 
  Tags, 
  Target,
  Settings,
  DollarSign,
  LogOut,
  User,
  Bell,
  Menu,
  X,
  BarChart3,
  ArrowLeftRight,
  ChevronDown,
  Calculator,
  FileText,
  TrendingDown,
  Scan,
  Camera
} from 'lucide-react';
import { AuthService, type AuthUser } from '../lib/auth';
import { DatabaseService } from '../lib/database';
import { ChatBot } from './ChatBot/ChatBot';
import { ChatBotExecutivo } from './ChatBot/ChatBotExecutivo';
import { NotificationPanel } from './Notifications/NotificationPanel';
import { AnomaliaDetector } from './AnomaliaDetector/AnomaliaDetector';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
  user: AuthUser;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'lancamentos', label: 'Lançamentos', icon: PlusCircle },
  { id: 'contas', label: 'Contas', icon: CreditCard },
  { id: 'categorias', label: 'Categorias', icon: Tags },
  { id: 'metas', label: 'Metas', icon: Target },
  { id: 'orcamentos', label: 'Orçamentos', icon: Calculator },
  { id: 'transferencias', label: 'Transferências', icon: ArrowLeftRight },
  { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
];

const advancedMenuItems = [
  { id: 'conciliacao', label: 'Conciliação', icon: FileText },
  { id: 'dividas', label: 'Dívidas', icon: TrendingDown },
  { id: 'sankey', label: 'Fluxo Sankey', icon: BarChart3 },
  { id: 'ocr', label: 'OCR Recibos', icon: Camera },
];

export function Layout({ children, currentPage, onPageChange, user }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showAnomalias, setShowAnomalias] = useState(false);
  const [showAdvancedMenu, setShowAdvancedMenu] = useState(false);
  const [notificacoesPendentes, setNotificacoesPendentes] = useState<any[]>([]);

  useEffect(() => {
    loadNotificacoes();
    const interval = setInterval(loadNotificacoes, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadNotificacoes = async () => {
    try {
      const notificacoes = await DatabaseService.getNotificacoesPendentes();
      setNotificacoesPendentes(notificacoes);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      if (error instanceof Error && error.message === 'Usuário não autenticado') {
        await AuthService.signOut();
        return;
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await AuthService.signOut();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const handlePageChange = (pageId: string) => {
    onPageChange(pageId);
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
    setShowAdvancedMenu(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('[data-dropdown]')) {
        setNotificationsOpen(false);
        setUserMenuOpen(false);
        setShowAdvancedMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            <div className="flex items-center space-x-4 flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    FinanceApp Pro
                  </h1>
                  <p className="text-xs text-gray-500 leading-tight">Gestão Avançada</p>
                </div>
              </div>
            </div>

            <nav className="hidden lg:flex items-center justify-center flex-1 max-w-6xl mx-8">
              <div className="flex items-center space-x-1 bg-gray-50 rounded-2xl p-1.5 shadow-inner">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => handlePageChange(item.id)}
                      aria-label={`Navegar para ${item.label}`}
                      className={`
                        group flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 whitespace-nowrap relative overflow-hidden
                        ${isActive 
                          ? 'bg-white text-indigo-700 shadow-md ring-1 ring-indigo-100 transform scale-105' 
                          : 'text-gray-600 hover:text-indigo-600 hover:bg-white/70 hover:shadow-sm hover:scale-102'
                        }
                      `}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 transition-transform duration-300 ${
                        isActive ? 'scale-110' : 'group-hover:scale-110'
                      }`} />
                      <span className="hidden xl:block font-medium">{item.label}</span>
                      
                      {isActive && (
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />
                      )}
                    </button>
                  );
                })}
                
                {/* Menu Avançado */}
                <div className="relative" data-dropdown>
                  <button
                    onClick={() => setShowAdvancedMenu(!showAdvancedMenu)}
                    className="group flex items-center space-x-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 text-gray-600 hover:text-indigo-600 hover:bg-white/70 hover:shadow-sm"
                  >
                    <Scan className="w-4 h-4 flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />
                    <span className="hidden xl:block font-medium">Avançado</span>
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showAdvancedMenu ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showAdvancedMenu && (
                    <div className="absolute top-full mt-2 left-0 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                      {advancedMenuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentPage === item.id;
                        
                        return (
                          <button
                            key={item.id}
                            onClick={() => handlePageChange(item.id)}
                            className={`w-full flex items-center space-x-3 px-4 py-3 text-sm transition-colors ${
                              isActive 
                                ? 'bg-indigo-50 text-indigo-700 border-r-2 border-indigo-500' 
                                : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </nav>

            <div className="flex items-center space-x-2 flex-shrink-0">
              
              <div className="relative" data-dropdown>
                <button
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  aria-label="Notificações"
                  className="relative p-2.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-200 group"
                >
                  <Bell className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
                  {notificacoesPendentes.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg animate-pulse">
                      {notificacoesPendentes.length > 9 ? '9+' : notificacoesPendentes.length}
                    </span>
                  )}
                </button>
                
                {notificationsOpen && (
                  <NotificationPanel 
                    notificacoes={notificacoesPendentes}
                    onClose={() => setNotificationsOpen(false)}
                    onRefresh={loadNotificacoes}
                  />
                )}
              </div>

              <div className="relative" data-dropdown>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  aria-label="Menu do usuário"
                  className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-xl transition-all duration-200 group"
                >
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-semibold text-gray-900 leading-tight">
                      {user.profile?.nome || user.email || 'Usuário'}
                    </p>
                    {user.profile?.nome && (
                      <p className="text-xs text-gray-500 leading-tight truncate max-w-32">
                        {user.email}
                      </p>
                    )}
                  </div>
                  
                  <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-200">
                    {user.profile?.avatar_url ? (
                      <img 
                        src={user.profile.avatar_url} 
                        alt="Avatar" 
                        className="w-full h-full rounded-xl object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-white" />
                    )}
                  </div>
                  
                  <ChevronDown className={`w-4 h-4 text-gray-400 hidden sm:block transition-transform duration-200 ${
                    userMenuOpen ? 'rotate-180' : ''
                  }`} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                          {user.profile?.avatar_url ? (
                            <img 
                              src={user.profile.avatar_url} 
                              alt="Avatar" 
                              className="w-full h-full rounded-xl object-cover"
                            />
                          ) : (
                            <User className="w-5 h-5 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {user.profile?.nome || user.email || 'Usuário'}
                          </p>
                          {user.profile?.nome && (
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handlePageChange('configuracoes')}
                      className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors group"
                    >
                      <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
                      <span>Configurações</span>
                    </button>
                    
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center space-x-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors group"
                    >
                      <LogOut className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                      <span>Sair</span>
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Menu mobile"
                className="lg:hidden p-2.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-200"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <>
            <div 
              className="lg:hidden fixed inset-0 bg-gray-900 bg-opacity-50 z-40 animate-in fade-in duration-200"
              onClick={() => setMobileMenuOpen(false)}
            />
            
            <div className="lg:hidden fixed top-0 right-0 h-full w-80 max-w-sm bg-white shadow-2xl z-50 transform transition-transform duration-300 animate-in slide-in-from-right overflow-y-auto">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        FinanceApp Pro
                      </h2>
                      <p className="text-xs text-gray-500">Gestão Avançada</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-4 space-y-2">
                {/* Menu Principal */}
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">Principal</h3>
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => handlePageChange(item.id)}
                        className={`
                          w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group
                          ${isActive 
                            ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-200 shadow-sm' 
                            : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
                          }
                        `}
                      >
                        <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${
                          isActive ? 'scale-110' : 'group-hover:scale-110'
                        }`} />
                        <span>{item.label}</span>
                        {isActive && (
                          <div className="ml-auto w-2 h-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Menu Avançado */}
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">Funcionalidades Avançadas</h3>
                  {advancedMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => handlePageChange(item.id)}
                        className={`
                          w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group
                          ${isActive 
                            ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-200 shadow-sm' 
                            : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
                          }
                        `}
                      >
                        <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${
                          isActive ? 'scale-110' : 'group-hover:scale-110'
                        }`} />
                        <span>{item.label}</span>
                        {isActive && (
                          <div className="ml-auto w-2 h-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" />
                        )}
                      </button>
                    );
                  })}
                </div>
                
                <div className="pt-4 mt-4 border-t border-gray-200 space-y-2">
                  <button
                    onClick={() => handlePageChange('configuracoes')}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-gray-50 transition-all duration-200 group"
                  >
                    <Settings className="w-5 h-5 flex-shrink-0 group-hover:rotate-90 transition-transform duration-200" />
                    <span>Configurações</span>
                  </button>
                  
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200 group"
                  >
                    <LogOut className="w-5 h-5 flex-shrink-0 group-hover:translate-x-1 transition-transform duration-200" />
                    <span>Sair</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Detector de Anomalias - Mostrar apenas no dashboard */}
          {currentPage === 'dashboard' && (
            <div className="mb-6">
              <button
                onClick={() => setShowAnomalias(!showAnomalias)}
                className="mb-4 flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                <span>{showAnomalias ? 'Ocultar' : 'Mostrar'} Detecção de Anomalias</span>
              </button>
              
              {showAnomalias && <AnomaliaDetector />}
            </div>
          )}
          
          {children}
        </div>
      </main>

      <ChatBot />
      <ChatBotExecutivo />
    </div>
  );
}