'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Menu, 
  X, 
  MessageCircle, 
  BookOpen, 
  BarChart3, 
  User, 
  LogOut,
  Home,
  ChevronDown
} from 'lucide-react';
import Link from 'next/link';

interface NavbarProps {
  showAuthButtons?: boolean;
  onAuthModalOpen?: (mode: 'login' | 'signup') => void;
}

export default function Navbar({ showAuthButtons = false, onAuthModalOpen }: NavbarProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  const navItems = [
    { href: '/qa', label: 'Q&A', icon: MessageCircle },
    { href: '/quiz', label: 'Quiz', icon: BookOpen },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <nav className="fixed top-0 w-full z-50 backdrop-blur-xl bg-gradient-to-r from-gray-900/90 to-black/90 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-18 md:h-20">
         {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 flex-shrink-0 py-2">
            <img 
              src="/logo.png" 
              alt="VoiceMitra Logo" 
              className="h-12 sm:h-14 md:h-16 w-auto object-contain max-w-[140px] sm:max-w-[160px] md:max-w-[180px] lg:max-w-[200px]"
            />
          </Link>

          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {session && (
              <>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className={`text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 px-3 lg:px-4 ${
                          isActive(item.href) ? 'bg-white/10 text-white' : ''
                        }`}
                      >
                        <Icon className="h-4 w-4 mr-1.5 lg:mr-2" />
                        <span className="text-sm lg:text-base">{item.label}</span>
                      </Button>
                    </Link>
                  );
                })}
              </>
            )}
          </div>

          {/* Desktop Auth Section */}
          <div className="hidden md:flex items-center space-x-3 lg:space-x-4">
            {session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 lg:h-10 lg:w-auto lg:px-3 rounded-full lg:rounded-lg hover:bg-white/10 transition-all duration-200">
                    <Avatar className="h-8 w-8 lg:h-9 lg:w-9">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm lg:text-base font-semibold">
                        {getUserInitials(session.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden lg:flex items-center ml-2">
                      <span className="text-white/90 text-sm font-medium max-w-24 xl:max-w-32 truncate">
                        {session.user.name}
                      </span>
                      <ChevronDown className="h-4 w-4 text-white/60 ml-1" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  className="w-56 bg-gray-900/95 border-white/20 backdrop-blur-xl" 
                  align="end"
                  forceMount
                >
                  <div className="flex items-center justify-start space-x-2 p-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-semibold">
                        {getUserInitials(session.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium text-white leading-none">
                        {session.user.name}
                      </p>
                      <p className="text-xs text-white/60 leading-none">
                        {session.user.email}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator className="bg-white/20" />
                  <DropdownMenuItem asChild className="text-white hover:bg-white/10 cursor-pointer">
                    <Link href="/dashboard" className="flex items-center">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/20" />
                  <DropdownMenuItem 
                    onClick={handleSignOut}
                    className="text-red-400 hover:bg-red-500/10 hover:text-red-300 cursor-pointer"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : showAuthButtons && onAuthModalOpen ? (
              <>
                <Button 
                  onClick={() => onAuthModalOpen('login')}
                  variant="ghost" 
                  size="sm"
                  className="text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200"
                >
                  Sign In
                </Button>
                <Button 
                  onClick={() => onAuthModalOpen('signup')}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-all duration-300 hover:shadow-lg transform hover:scale-105"
                >
                  Get Started
                </Button>
              </>
            ) : null}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white hover:bg-white/10 p-2"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 space-y-1 animate-slide-up border-t border-white/10">
            {session ? (
              <>
                {/* User Profile Section */}
                <div className="flex items-center space-x-3 px-3 py-3 bg-white/5 rounded-lg mb-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold">
                      {getUserInitials(session.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {session.user.name}
                    </p>
                    <p className="text-xs text-white/60 truncate">
                      {session.user.email}
                    </p>
                  </div>
                </div>

                {/* Navigation Items */}
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className={`w-full justify-start text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 ${
                          isActive(item.href) ? 'bg-white/10 text-white' : ''
                        }`}
                      >
                        <Icon className="h-4 w-4 mr-3" />
                        {item.label}
                      </Button>
                    </Link>
                  );
                })}

                {/* Dashboard Link */}
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className={`w-full justify-start text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200 ${
                      isActive('/dashboard') ? 'bg-white/10 text-white' : ''
                    }`}
                  >
                    <BarChart3 className="h-4 w-4 mr-3" />
                    Dashboard
                  </Button>
                </Link>

                {/* Sign Out */}
                <Button 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  variant="ghost" 
                  size="sm"
                  className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200"
                >
                  <LogOut className="h-4 w-4 mr-3" />
                  Sign Out
                </Button>
              </>
            ) : showAuthButtons && onAuthModalOpen ? (
              <div className="space-y-2 px-3">
                <Button 
                  onClick={() => {
                    onAuthModalOpen('login');
                    setMobileMenuOpen(false);
                  }}
                  variant="ghost" 
                  size="sm"
                  className="w-full text-white/80 hover:text-white hover:bg-white/10"
                >
                  Sign In
                </Button>
                <Button 
                  onClick={() => {
                    onAuthModalOpen('signup');
                    setMobileMenuOpen(false);
                  }}
                  size="sm"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                >
                  Get Started
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </nav>
  );
}