import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Send, Bot, User, HelpCircle } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showFAQ, setShowFAQ] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const faqData: FAQ[] = [
    {
      id: '1',
      question: 'How do I create a new letter?',
      answer: 'To create a new letter, click on the "Create E-Letter" section in your dashboard. You can use the available templates to generate formal letters quickly.',
      category: 'Letter Creation'
    },
    {
      id: '2',
      question: 'What is the approval process?',
      answer: 'Your letters go through a digital approval workflow: Mentor → HOD → Dean. Each approver reviews and either approves or rejects your letter with feedback.',
      category: 'Approval Process'
    },
    {
      id: '3',
      question: 'How long does approval take?',
      answer: 'Approval time varies depending on faculty availability. Typically, it takes 2-5 business days for each approval step in the workflow.',
      category: 'Timeline'
    },
    {
      id: '4',
      question: 'Can I track my letter status?',
      answer: 'Yes! In the "My Letters" section, you can see the real-time status of all your submitted letters including pending, approved, or rejected status.',
      category: 'Tracking'
    },
    {
      id: '5',
      question: 'What if my letter gets rejected?',
      answer: 'If your letter is rejected, you will see the rejection reason. You can then modify your letter and resubmit it for approval.',
      category: 'Rejection'
    },
    {
      id: '6',
      question: 'How do I download my approved letter?',
      answer: 'Once your letter is approved or signed, you will see a "Download" button next to your letter in the "My Letters" section.',
      category: 'Download'
    },
    {
      id: '7',
      question: 'What file formats are supported?',
      answer: 'The system supports PDF files for document uploads. For E-Letters, the system generates HTML format documents that can be easily downloaded.',
      category: 'File Formats'
    },
    {
      id: '8',
      question: 'Can I edit my letter after submission?',
      answer: 'No, you cannot edit a letter once it\'s submitted. If changes are needed, you would need to create a new letter or wait for rejection feedback.',
      category: 'Editing'
    },
    {
      id: '9',
      question: 'Who can I contact for technical support?',
      answer: 'For technical issues, please contact your system administrator or IT support team. They can help with login issues, system errors, or other technical problems.',
      category: 'Support'
    },
    {
      id: '10',
      question: 'Is my data secure?',
      answer: 'Yes, the system uses secure authentication and all your documents are encrypted. Only authorized faculty members can access your submitted letters.',
      category: 'Security'
    },
    {
      id: '11',
      question: 'How can I send a reminder for my pending letter?',
      answer: 'If your letter is taking too long to get approved, you can send a friendly reminder to the faculty member. Click on "Send Reminder" next to your pending letter in the "My Letters" section. You can send one reminder per day.',
      category: 'Reminders'
    },
    {
      id: '12',
      question: 'What if my letter is stuck in approval?',
      answer: 'If your letter has been pending for more than 5 business days, you can send a reminder to the faculty member. The system will automatically determine who to send the reminder to based on the current approval stage.',
      category: 'Reminders'
    }
  ];


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Add welcome message when chatbot opens
      const welcomeMessage: Message = {
        id: 'welcome',
        text: 'Hello! I\'m your Veltech digital assistant. I can help you with questions about the document approval system. You can ask me anything or browse the Quick Help section below!',
        isUser: false,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    // Simulate bot response
    setTimeout(() => {
      const botResponse = generateBotResponse(inputValue);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    }, 1000);
  };

  const generateBotResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    // Simple keyword matching for responses
    if (input.includes('hello') || input.includes('hi')) {
      return 'Hello! How can I help you today? You can ask me about creating letters, tracking approvals, or any other questions about the system.';
    }
    
    if (input.includes('letter') && input.includes('create')) {
      return 'To create a new letter, go to the "Create E-Letter" section in your dashboard. You can use templates to generate formal letters quickly. Would you like to know more about the approval process?';
    }
    
    if (input.includes('approval') || input.includes('approve')) {
      return 'The approval process follows this workflow: Mentor → HOD → Dean. Each step typically takes 2-5 business days. You can track the status in the "My Letters" section.';
    }
    
    if (input.includes('status') || input.includes('track')) {
      return 'You can track your letter status in the "My Letters" section. It shows real-time updates including pending, approved, or rejected status with timestamps.';
    }
    
    if (input.includes('download')) {
      return 'Once your letter is approved or signed, you\'ll see a download button next to it in the "My Letters" section. The system generates HTML format documents.';
    }
    
    if (input.includes('reject') || input.includes('rejected')) {
      return 'If your letter is rejected, you\'ll see the rejection reason. You can then create a new letter with the necessary changes and resubmit it.';
    }
    
    if (input.includes('help') || input.includes('support')) {
      return 'I\'m here to help! You can browse the Quick Help section below for common questions, or ask me anything specific about the document approval system.';
    }
    
    if (input.includes('reminder') || input.includes('remind')) {
      return 'If your letter is taking too long to get approved, you can send a friendly reminder to the faculty member. Go to the "My Letters" section and click "Send Reminder" next to your pending letter. You can send one reminder per day to avoid spamming faculty members.';
    }
    
    if (input.includes('stuck') || input.includes('pending') || input.includes('long')) {
      return 'If your letter has been pending for more than 5 business days, you can send a reminder to the faculty member. The system will automatically determine who to send the reminder to based on the current approval stage (Mentor → HOD → Dean).';
    }
    
    // Default response
    return 'I understand you\'re asking about: "' + userInput + '". While I can help with general questions about the document approval system, for specific issues, please check the Quick Help section below or contact your system administrator.';
  };

  const handleFAQClick = (faq: FAQ) => {
    const faqMessage: Message = {
      id: Date.now().toString(),
      text: `**${faq.question}**\n\n${faq.answer}`,
      isUser: false,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, faqMessage]);
    setShowFAQ(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Chatbot Toggle Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => setIsOpen(true)}
            className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse relative"
            size="lg"
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 100 100" className="text-white">
                <defs>
                  <linearGradient id="veltechGradBtn" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#e0e7ff" />
                  </linearGradient>
                </defs>
                <rect x="15" y="25" width="70" height="50" rx="6" fill="url(#veltechGradBtn)" stroke="white" strokeWidth="1.5"/>
                <text x="50" y="40" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#1e40af">V</text>
                <text x="50" y="52" textAnchor="middle" fontSize="6" fill="#1e40af">TECH</text>
                <circle cx="25" cy="32" r="2" fill="#3b82f6"/>
                <circle cx="75" cy="32" r="2" fill="#3b82f6"/>
              </svg>
            </div>
          </Button>
        </div>
      )}

      {/* Chatbot Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Veltech Logo */}
              <div className="p-2 bg-white/20 rounded-lg">
                <svg width="20" height="20" viewBox="0 0 100 100" className="text-white">
                  <defs>
                    <linearGradient id="veltechGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="100%" stopColor="#e0e7ff" />
                    </linearGradient>
                  </defs>
                  <rect x="10" y="20" width="80" height="60" rx="8" fill="url(#veltechGrad)" stroke="white" strokeWidth="2"/>
                  <text x="50" y="45" textAnchor="middle" fontSize="12" fontWeight="bold" fill="#1e40af">V</text>
                  <text x="50" y="60" textAnchor="middle" fontSize="8" fill="#1e40af">TECH</text>
                  <circle cx="20" cy="30" r="3" fill="#3b82f6"/>
                  <circle cx="80" cy="30" r="3" fill="#3b82f6"/>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold">Veltech Assistant</h3>
                <p className="text-xs text-blue-100">Ask me anything!</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFAQ(!showFAQ)}
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick Questions Section */}
          {showFAQ && (
            <div className="bg-gray-50 border-b border-gray-200 max-h-48 overflow-y-auto">
              <div className="p-3">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Quick Help</h4>
                <div className="space-y-2">
                  {faqData.slice(0, 5).map((faq) => (
                    <button
                      key={faq.id}
                      onClick={() => handleFAQClick(faq)}
                      className="w-full text-left p-2 text-xs bg-white rounded border hover:bg-blue-50 hover:border-blue-300 transition-colors"
                    >
                      <div className="font-medium text-gray-900">{faq.question}</div>
                      <div className="text-gray-500 mt-1">{faq.answer.substring(0, 60)}...</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.isUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {!message.isUser && (
                      <Bot className="h-4 w-4 mt-0.5 text-blue-600 flex-shrink-0" />
                    )}
                    {message.isUser && (
                      <User className="h-4 w-4 mt-0.5 text-blue-200 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                      <p className={`text-xs mt-1 ${
                        message.isUser ? 'text-blue-200' : 'text-gray-500'
                      }`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Press Enter to send • Click Quick Help for instant answers
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;
