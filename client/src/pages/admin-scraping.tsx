import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Clock, Database, Globe, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ScrapingProgress {
  totalRecipes: number;
  target: number;
  progress: number;
}

interface ScrapingStatus {
  isRunning: boolean;
  message: string;
  status: 'idle' | 'in_progress' | 'completed' | 'error';
}

export default function AdminScraping() {
  const [scrapingStatus, setScrapingStatus] = useState<ScrapingStatus>({
    isRunning: false,
    message: 'Ready to start mass recipe scraping',
    status: 'idle'
  });
  const [progress, setProgress] = useState<ScrapingProgress>({
    totalRecipes: 0,
    target: 10000,
    progress: 0
  });
  const { toast } = useToast();

  // Fetch current progress on component mount
  useEffect(() => {
    fetchProgress();
    const interval = setInterval(fetchProgress, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchProgress = async () => {
    try {
      const response = await fetch('/api/scraping-progress');
      if (response.ok) {
        const data = await response.json();
        setProgress(data);
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
    }
  };

  const startScraping = async () => {
    try {
      setScrapingStatus({
        isRunning: true,
        message: 'Starting mass recipe scraping...',
        status: 'in_progress'
      });

      const response = await fetch('/api/scrape-recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setScrapingStatus({
          isRunning: true,
          message: data.message,
          status: 'in_progress'
        });

        toast({
          title: "Scraping Started",
          description: "Mass recipe scraping has begun. This will take several hours to complete.",
        });
      } else {
        throw new Error('Failed to start scraping');
      }
    } catch (error) {
      console.error('Error starting scraping:', error);
      setScrapingStatus({
        isRunning: false,
        message: 'Failed to start scraping',
        status: 'error'
      });

      toast({
        title: "Error",
        description: "Failed to start mass recipe scraping. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = () => {
    switch (scrapingStatus.status) {
      case 'in_progress':
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Database className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (scrapingStatus.status) {
      case 'in_progress':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Recipe Database Builder</h1>
          <p className="text-gray-600">
            Mass scrape and validate 10,000 authentic recipes with GPT-4o
          </p>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon()}
              Scraping Status
              <Badge variant="outline" className={getStatusColor()}>
                {scrapingStatus.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 mb-4">{scrapingStatus.message}</p>
            
            {!scrapingStatus.isRunning && (
              <Button 
                onClick={startScraping}
                className="bg-cravii-red hover:bg-cravii-red-dark text-white"
                size="lg"
              >
                <Zap className="w-4 h-4 mr-2" />
                Start Mass Recipe Scraping
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Progress Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Database Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                Recipes Collected: {progress.totalRecipes.toLocaleString()} / {progress.target.toLocaleString()}
              </span>
              <span className="text-sm font-medium">
                {progress.progress}%
              </span>
            </div>
            
            <Progress value={progress.progress} className="w-full" />
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {progress.totalRecipes.toLocaleString()}
                </div>
                <div className="text-sm text-blue-600">Validated Recipes</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {progress.target.toLocaleString()}
                </div>
                <div className="text-sm text-green-600">Target Goal</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Process Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Scraping Process Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-3xl mb-2">🌐</div>
                <div className="font-semibold">Web Scraping</div>
                <div className="text-sm text-gray-600 mt-1">
                  Extract recipes from AllRecipes, Food.com, Epicurious, Bon Appétit, and more
                </div>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <div className="text-3xl mb-2">🤖</div>
                <div className="font-semibold">GPT-4o Validation</div>
                <div className="text-sm text-gray-600 mt-1">
                  Validate authenticity, extract ingredients, and format instructions
                </div>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <div className="text-3xl mb-2">💾</div>
                <div className="font-semibold">Database Storage</div>
                <div className="text-sm text-gray-600 mt-1">
                  Store validated recipes with proper categorization and tagging
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
              <h4 className="font-semibold text-yellow-800">⚠️ Important Notes</h4>
              <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                <li>• This process will take several hours to complete</li>
                <li>• Each recipe is validated by GPT-4o for authenticity</li>
                <li>• Only legitimate recipes with proper ingredients and instructions are saved</li>
                <li>• Rate limiting is applied to respect website resources</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}