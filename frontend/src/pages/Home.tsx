import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Users, Shield, CheckCircle } from 'lucide-react';

const Home = () => {
  return (
    <div className="min-h-screen">
      {/* Ultra Modern Hero Section */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-pink-900/20"></div>
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-purple-500/30 rounded-full blur-3xl animate-float" style={{animationDelay: '2s'}}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl animate-float" style={{animationDelay: '4s'}}></div>
        </div>
        <div className="relative container-responsive text-center">
          <div className="max-w-6xl mx-auto">
            <div className="animate-float mb-12">
              <div className="relative inline-block">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-3xl shadow-2xl flex items-center justify-center">
                  <FileText className="h-16 w-16 text-white" />
                </div>
                <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl blur opacity-30 animate-pulse"></div>
              </div>
            </div>
            <h1 className="text-8xl font-bold mb-8 leading-tight animate-fade-in">
              Digital Document
              <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mt-2">
                Approval System
              </span>
            </h1>
            <p className="text-2xl text-gray-300 mb-12 leading-relaxed max-w-4xl mx-auto animate-slide-up font-light">
              Streamline your academic document approval process with our modern, efficient platform. 
              Submit, track, and approve documents seamlessly with digital signatures and real-time tracking.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center animate-bounce-in">
              <Button asChild size="lg" className="bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 shadow-2xl hover:shadow-3xl transition-all duration-500 hover:-translate-y-2 text-lg px-8 py-4 rounded-2xl font-semibold">
                <Link to="/register">Get Started</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm text-lg px-8 py-4 rounded-2xl font-semibold">
                <Link to="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Ultra Modern Features Section */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/50 to-gray-800/50"></div>
        <div className="container-responsive relative">
          <div className="text-center mb-20 animate-fade-in">
            <h2 className="text-6xl font-bold text-white mb-6">
              Why Choose <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">DocuFlow</span>?
            </h2>
            <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Experience the future of document approval with our comprehensive platform designed for modern educational institutions.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            <Card className="text-center glass-card-ultra hover-lift animate-slide-in-left group">
              <CardHeader className="pb-6">
                <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-500 rounded-3xl flex items-center justify-center mb-6 shadow-2xl group-hover:scale-110 transition-all duration-500">
                  <FileText className="h-12 w-12 text-white" />
                </div>
                <CardTitle className="text-2xl mb-4 text-white">Easy Document Upload</CardTitle>
                <CardDescription className="text-lg leading-relaxed text-gray-300">
                  Upload PDF and DOCX documents with automatic summary generation and intelligent approval routing.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-300 bg-blue-500/20 p-4 rounded-xl border border-blue-500/30">
                  <span className="font-semibold text-blue-300">Smart Processing:</span> Supports multiple file formats with AI-powered analysis
                </div>
              </CardContent>
            </Card>

            <Card className="text-center glass-card-ultra hover-lift animate-slide-up group">
              <CardHeader className="pb-6">
                <div className="mx-auto w-24 h-24 bg-gradient-to-br from-green-500 to-teal-500 rounded-3xl flex items-center justify-center mb-6 shadow-2xl group-hover:scale-110 transition-all duration-500">
                  <Users className="h-12 w-12 text-white" />
                </div>
                <CardTitle className="text-2xl mb-4 text-white">Role-Based Access</CardTitle>
                <CardDescription className="text-lg leading-relaxed text-gray-300">
                  Dedicated dashboards for students and faculty with appropriate permissions and secure workflows.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-300 bg-green-500/20 p-4 rounded-xl border border-green-500/30">
                  <span className="font-semibold text-green-300">Secure Access:</span> VTU ID integration with enterprise-grade security
                </div>
              </CardContent>
            </Card>

            <Card className="text-center glass-card-ultra hover-lift animate-slide-in-right group">
              <CardHeader className="pb-6">
                <div className="mx-auto w-24 h-24 bg-gradient-to-br from-orange-500 to-pink-500 rounded-3xl flex items-center justify-center mb-6 shadow-2xl group-hover:scale-110 transition-all duration-500">
                  <CheckCircle className="h-12 w-12 text-white" />
                </div>
                <CardTitle className="text-2xl mb-4 text-white">Real-time Tracking</CardTitle>
                <CardDescription className="text-lg leading-relaxed text-gray-300">
                  Track your document approval status in real-time with detailed progress updates and notifications.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-300 bg-orange-500/20 p-4 rounded-xl border border-orange-500/30">
                  <span className="font-semibold text-orange-300">Live Updates:</span> Instant notifications and comprehensive status tracking
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Ultra Modern Admin Registration Section */}
      <section className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-orange-900/20 to-yellow-900/20"></div>
        <div className="container-responsive text-center relative">
          <div className="max-w-3xl mx-auto">
            <div className="animate-bounce-in mb-8">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-r from-red-500 to-orange-500 rounded-3xl shadow-2xl">
                <Shield className="h-12 w-12 text-white" />
              </div>
            </div>
            <h2 className="text-5xl font-bold text-white mb-6 animate-fade-in">
              Administrator Access
            </h2>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed animate-slide-up">
              Need to manage the system? Contact the system administrator for admin account setup and system configuration.
            </p>
            <div className="text-sm text-gray-300 bg-red-500/20 p-6 rounded-2xl border border-red-500/30 shadow-lg animate-scale-in">
              <p className="font-semibold mb-2 text-lg text-red-300">Administrator Access Required</p>
              <p className="leading-relaxed">Please contact the system administrator to request admin privileges and system management access.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Ultra Modern CTA Section */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-pink-900/20"></div>
        <div className="container-responsive text-center relative">
          <div className="max-w-5xl mx-auto">
            <div className="animate-bounce-in mb-8">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-3xl shadow-2xl">
                <Shield className="h-12 w-12 text-white" />
              </div>
            </div>
            <h2 className="text-6xl font-bold text-white mb-6 animate-fade-in">
              Ready to Get Started?
            </h2>
            <p className="text-xl text-gray-300 mb-12 leading-relaxed animate-slide-up">
              Join thousands of students and faculty already using DocuFlow for seamless document management and approval workflows.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center animate-bounce-in">
              <Button asChild size="lg" className="bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 text-lg px-8 py-4 rounded-2xl font-semibold shadow-2xl hover:shadow-3xl transition-all duration-300">
                <Link to="/register">Create Account</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20 text-lg px-8 py-4 rounded-2xl font-semibold transition-all duration-300">
                <Link to="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;