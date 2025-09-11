// components/navigation.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUser, useOrganization } from '@clerk/nextjs'
import { useClerk } from '@clerk/nextjs'
import { 
  Home, 
  Film, 
  Upload, 
  DollarSign, 
  Users, 
  BarChart3, 
  Heart,
  Shield,
  HardDrive,
  HelpCircle,
  LogOut,
  Bell,
  RefreshCw,
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
  Menu,
  X,
  Settings,
  CreditCard,
  User,
  TrendingUp,
  Clock,
  CheckCircle2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface NavigationProps {
  studio?: {
    id: string
    name: string
    tier: string
    storage_used: number
    storage_total: number
  } | null
  stats?: {
    contentCount: number
    totalViews: number
    publishedCount: number
    draftCount: number
    notificationCount: number
  }
}

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  badge?: string | number
  badgeColor?: 'default' | 'destructive' | 'warning' | 'success'
}

export default function Navigation({ studio, stats }: NavigationProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useClerk()
  const { user } = useUser()
  const { organization } = useOrganization()
  
  // Sidebar state - persist in localStorage
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarOpen')
      return saved !== null ? JSON.parse(saved) : true
    }
    return true
  })
  
  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(isSidebarOpen))
    // Update body padding based on sidebar state
    document.body.style.paddingLeft = isSidebarOpen ? '240px' : '60px'
    
    // For mobile, remove padding
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        document.body.style.paddingLeft = '0'
      } else {
        document.body.style.paddingLeft = isSidebarOpen ? '240px' : '60px'
      }
    }
    
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      document.body.style.paddingLeft = '0'
    }
  }, [isSidebarOpen])
  
  const mainNavItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: <Home className="h-4 w-4 flex-shrink-0" />
    },
    {
      label: 'Content Library',
      href: '/content',
      icon: <Film className="h-4 w-4 flex-shrink-0" />,
      badge: stats?.contentCount || undefined
    },
    {
      label: 'Upload Center',
      href: '/upload',
      icon: <Upload className="h-4 w-4 flex-shrink-0" />
    },
    {
      label: 'Revenue',
      href: '/revenue',
      icon: <DollarSign className="h-4 w-4 flex-shrink-0" />
    },
    {
      label: 'Audience',
      href: '/audience',
      icon: <Users className="h-4 w-4 flex-shrink-0" />,
      badge: 'New',
      badgeColor: 'success'
    },
    {
      label: 'Analytics',
      href: '/analytics',
      icon: <BarChart3 className="h-4 w-4 flex-shrink-0" />
    },
    {
      label: 'Team',
      href: '/team',
      icon: <Users className="h-4 w-4 flex-shrink-0" />
    }
  ]

  const bottomNavItems: NavItem[] = [
    {
      label: 'Settings',
      href: '/settings',
      icon: <Settings className="h-4 w-4 flex-shrink-0" />
    },
    {
      label: 'Help & Support',
      href: '/support',
      icon: <HelpCircle className="h-4 w-4 flex-shrink-0" />
    }
  ]
  
  const isActive = (path: string) => {
    if (path === '/dashboard' && pathname === '/dashboard') return true
    if (path !== '/dashboard' && pathname.startsWith(path)) return true
    return false
  }
  
  const storagePercentage = studio 
    ? (studio.storage_used / studio.storage_total) * 100 
    : 0
  
  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }
  
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }
  
  return (
    <>
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 bg-[#1a1625] border-b border-[#2a2435] text-white z-50 h-[57px]">
        <div className="px-4 lg:px-6 h-full flex items-center justify-between">
          {/* Left side */}
          <div className="flex items-center gap-2 lg:gap-4">
            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-gray-300 hover:text-white hover:bg-[#2a2435]"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            
            {/* Desktop Sidebar Toggle */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden lg:flex text-gray-300 hover:text-white hover:bg-[#2a2435]"
                    onClick={toggleSidebar}
                  >
                    {isSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <span className="text-xl font-semibold hidden sm:block">
                AniFlixx Studio
              </span>
            </Link>
            
            {/* Studio Badge */}
            {studio && (
              <Badge 
                variant="outline" 
                className={cn(
                  "hidden lg:flex border-purple-500/30",
                  studio.tier === 'premium' 
                    ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300" 
                    : "bg-gray-500/10 text-gray-400"
                )}
              >
                {studio.tier === 'premium' ? (
                  <>
                    <Sparkles className="h-3 w-3 mr-1" />
                    Premium
                  </>
                ) : (
                  'Free Plan'
                )}
              </Badge>
            )}
          </div>
          
          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Quick Stats - Desktop Only */}
            {stats && (
              <div className="hidden lg:flex items-center gap-4 mr-4">
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <span className="text-gray-300">{stats.totalViews} views</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-blue-400" />
                  <span className="text-gray-300">{stats.publishedCount} published</span>
                </div>
              </div>
            )}
            
            {/* Refresh Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-gray-300 hover:text-white hover:bg-[#2a2435]"
                    onClick={() => router.refresh()}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Refresh data</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* Notifications */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-gray-300 hover:text-white hover:bg-[#2a2435] relative"
                  >
                    <Bell className="h-4 w-4" />
                    {stats && stats.notificationCount > 0 && (
                      <>
                        <span className="absolute top-1 right-1 w-2 h-2 bg-pink-500 rounded-full animate-pulse"></span>
                        <span className="absolute -top-1 -right-1 bg-pink-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center font-medium">
                          {stats.notificationCount}
                        </span>
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {stats?.notificationCount || 0} notifications
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="text-gray-300 hover:text-white hover:bg-[#2a2435] gap-2"
                >
                  <span className="hidden sm:inline text-sm">
                    {organization?.name || user?.firstName || studio?.name || 'Account'}
                  </span>
                  {user?.imageUrl ? (
                    <img 
                      src={user.imageUrl} 
                      alt={user.firstName || 'User'} 
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {user?.firstName?.[0] || studio?.name?.[0] || 'U'}
                      </span>
                    </div>
                  )}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#1a1625] border-[#2a2435] text-white w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{user?.fullName || studio?.name || 'User'}</span>
                    <span className="text-xs text-gray-400 font-normal">
                      {user?.primaryEmailAddress?.emailAddress}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#2a2435]" />
                <DropdownMenuItem className="cursor-pointer" asChild>
                  <Link href="/settings">
                    <User className="h-4 w-4 mr-2" />
                    Profile Settings
                  </Link>
                </DropdownMenuItem>
                {organization && (
                  <DropdownMenuItem className="cursor-pointer" asChild>
                    <Link href="/settings/organization">
                      <Settings className="h-4 w-4 mr-2" />
                      Organization Settings
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="cursor-pointer" asChild>
                  <Link href="/billing">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Billing & Plan
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#2a2435]" />
                <DropdownMenuItem 
                  className="text-red-400 cursor-pointer"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:block fixed left-0 top-[57px] bottom-0 bg-[#141019] border-r border-[#2a2435] transition-all duration-300 overflow-hidden",
        isSidebarOpen ? "w-[240px]" : "w-[60px]"
      )}>
        <div className="flex flex-col h-full">
          {/* Main Navigation */}
          <div className="flex-1 overflow-y-auto py-4">
            <nav className="space-y-1 px-3">
              {mainNavItems.map((item) => (
                <TooltipProvider key={item.href}>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                          isActive(item.href)
                            ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white"
                            : "text-gray-400 hover:text-white hover:bg-[#1a1625]",
                          !isSidebarOpen && "justify-center"
                        )}
                      >
                        <div className={cn(
                          "flex items-center gap-3",
                          !isSidebarOpen && "justify-center"
                        )}>
                          {item.icon}
                          {isSidebarOpen && (
                            <>
                              <span className="flex-1">{item.label}</span>
                              {item.badge && (
                                <Badge 
                                  variant={item.badgeColor === 'success' ? 'default' : 'secondary'}
                                  className={cn(
                                    "text-xs ml-auto",
                                    item.badgeColor === 'success' 
                                      ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0"
                                      : "bg-[#2a2435] text-gray-300"
                                  )}
                                >
                                  {item.badge}
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                      </Link>
                    </TooltipTrigger>
                    {!isSidebarOpen && (
                      <TooltipContent side="right">
                        <span>{item.label}</span>
                        {item.badge && <span className="ml-2">({item.badge})</span>}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              ))}
            </nav>
          </div>

          {/* Bottom Section */}
          <div className="border-t border-[#2a2435] py-4 space-y-4">
            {/* Security Badge */}
            <div className="px-3">
              <div className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg",
                "bg-green-500/10 text-green-400",
                !isSidebarOpen && "justify-center px-0"
              )}>
                <Shield className="h-4 w-4 flex-shrink-0" />
                {isSidebarOpen && (
                  <>
                    <span className="text-sm font-medium">Data Security</span>
                    <span className="text-xs ml-auto">GDPR</span>
                  </>
                )}
              </div>
            </div>
            
            {/* Storage */}
            {isSidebarOpen && studio && (
              <div className="px-6">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-gray-400">Storage Used</span>
                  <span className="text-gray-300">{Math.round(storagePercentage)}%</span>
                </div>
                <Progress 
                  value={storagePercentage} 
                  className="h-1.5 bg-[#2a2435]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {studio.storage_used}GB of {studio.storage_total}GB
                </p>
                {storagePercentage > 80 && (
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="text-purple-400 hover:text-purple-300 p-0 h-auto mt-1"
                    asChild
                  >
                    <Link href="/billing">Upgrade Storage</Link>
                  </Button>
                )}
              </div>
            )}
            
            {/* Bottom Nav Items */}
            <nav className="space-y-1 px-3">
              {bottomNavItems.map((item) => (
                <TooltipProvider key={item.href}>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                          "text-gray-400 hover:text-white hover:bg-[#1a1625]",
                          !isSidebarOpen && "justify-center"
                        )}
                      >
                        {item.icon}
                        {isSidebarOpen && <span>{item.label}</span>}
                      </Link>
                    </TooltipTrigger>
                    {!isSidebarOpen && (
                      <TooltipContent side="right">
                        {item.label}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              ))}
            </nav>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Mobile Sidebar */}
      <aside className={cn(
        "lg:hidden fixed left-0 top-[57px] bottom-0 w-[280px] bg-[#141019] border-r border-[#2a2435] overflow-y-auto z-50 transform transition-transform duration-300",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Mobile navigation content - always expanded */}
          <div className="flex-1 overflow-y-auto py-4">
            <nav className="space-y-1 px-3">
              {mainNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    isActive(item.href)
                      ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white"
                      : "text-gray-400 hover:text-white hover:bg-[#1a1625]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <Badge 
                      variant={item.badgeColor === 'success' ? 'default' : 'secondary'}
                      className={cn(
                        "text-xs",
                        item.badgeColor === 'success' 
                          ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0"
                          : "bg-[#2a2435] text-gray-300"
                      )}
                    >
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              ))}
            </nav>
          </div>
          
          {/* Mobile bottom section */}
          <div className="border-t border-[#2a2435] py-4">
            <nav className="space-y-1 px-3">
              {bottomNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-[#1a1625] transition-all"
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
              <Button 
                variant="ghost" 
                className="w-full justify-start text-gray-400 hover:text-white hover:bg-[#1a1625]"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-3" />
                Logout
              </Button>
            </nav>
          </div>
        </div>
      </aside>
    </>
  )
}