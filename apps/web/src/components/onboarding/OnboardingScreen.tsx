'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { ChevronRight, TrendingUp, Shield, Zap, Wallet } from 'lucide-react';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const slides = [
  {
    icon: TrendingUp,
    title: 'Arbitraje Automático',
    description: 'Detecta oportunidades de arbitraje en Polymarket cuando YES + NO ≠ 1.00',
    color: 'from-green-500 to-emerald-600',
  },
  {
    icon: Zap,
    title: 'Ejecución Rápida',
    description: 'Ejecuta trades en milisegundos para aprovechar las oportunidades antes de que desaparezcan',
    color: 'from-yellow-500 to-orange-600',
  },
  {
    icon: Wallet,
    title: 'Tu Wallet, Tu Control',
    description: 'Conecta tu wallet de forma segura. Nunca almacenamos tus claves privadas',
    color: 'from-blue-500 to-indigo-600',
  },
  {
    icon: Shield,
    title: 'Gestión de Riesgos',
    description: 'Configura límites de pérdida, tamaño máximo de posición y más para proteger tu capital',
    color: 'from-purple-500 to-pink-600',
  },
];

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;
  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <div className="fixed inset-0 bg-telegram-bg flex flex-col">
      {/* Skip button */}
      {!isLastSlide && (
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={handleSkip}
            className="text-telegram-hint hover:text-telegram-text transition-colors"
          >
            Saltar
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            {/* Icon */}
            <div className={`w-24 h-24 mx-auto mb-8 rounded-2xl bg-gradient-to-br ${slide.color} flex items-center justify-center`}>
              <Icon className="w-12 h-12 text-white" />
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-telegram-text mb-4">
              {slide.title}
            </h2>

            {/* Description */}
            <p className="text-telegram-hint text-lg max-w-xs mx-auto">
              {slide.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom section */}
      <div className="px-8 pb-8 safe-bottom">
        {/* Dots */}
        <div className="flex justify-center space-x-2 mb-6">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? 'w-6 bg-primary-500'
                  : 'bg-telegram-hint/30'
              }`}
            />
          ))}
        </div>

        {/* Button */}
        <Button
          onClick={handleNext}
          className="w-full"
          size="lg"
          rightIcon={<ChevronRight className="w-5 h-5" />}
        >
          {isLastSlide ? 'Comenzar' : 'Siguiente'}
        </Button>
      </div>
    </div>
  );
}
