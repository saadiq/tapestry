import React, { useState, useEffect } from 'react';
import { Download, X, CheckCircle } from 'lucide-react';
import type { UpdateInfo, UpdateProgressInfo } from '@shared/types';

export const UpdateNotification: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [readyToInstall, setReadyToInstall] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('');

  useEffect(() => {
    // Get current version on mount
    window.electronAPI.getAppVersion().then(setCurrentVersion);

    // Set up update event listeners
    window.electronAPI.onUpdateAvailable((info) => {
      setUpdateInfo(info);
      setUpdateAvailable(true);
      setShowDialog(true); // Auto-show dialog when update is available
    });

    window.electronAPI.onUpdateDownloaded(() => {
      setReadyToInstall(true);
      setDownloading(false);
    });

    window.electronAPI.onUpdateStatus((status) => {
      if (status.status === 'download-progress' && status.data) {
        const progressData = status.data as UpdateProgressInfo;
        setDownloadProgress(Math.round(progressData.percent));
      }
    });

    // Cleanup
    return () => {
      window.electronAPI.removeUpdateListeners();
    };
  }, []);

  const handleDownload = async () => {
    setDownloading(true);
    await window.electronAPI.downloadUpdate();
  };

  const handleInstall = async () => {
    await window.electronAPI.quitAndInstall();
  };

  const handleDismiss = () => {
    setShowDialog(false);
  };

  // Show notification badge when update is available but dialog is hidden
  if (updateAvailable && !showDialog) {
    return (
      <div
        className="fixed bottom-4 right-4 z-50"
        onClick={() => setShowDialog(true)}
      >
        <div className="bg-primary text-primary-content px-4 py-2 rounded-lg shadow-lg cursor-pointer flex items-center gap-2 hover:bg-primary-focus transition-colors">
          <Download className="w-4 h-4" />
          <span className="text-sm font-medium">Update Available</span>
        </div>
      </div>
    );
  }

  // Show update dialog
  if (showDialog && updateInfo) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-base-100 rounded-xl shadow-2xl p-6 max-w-md w-full mx-4">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold">Update Available</h2>
              <p className="text-sm text-base-content/70 mt-1">
                Version {updateInfo.version} is now available
              </p>
              <p className="text-xs text-base-content/50 mt-1">
                Current version: {currentVersion}
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="btn btn-ghost btn-sm btn-circle"
              disabled={downloading}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Release Notes */}
          {updateInfo.releaseNotes && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold mb-2">What's New:</h3>
              <div className="text-sm text-base-content/70 max-h-32 overflow-y-auto">
                {updateInfo.releaseNotes}
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {downloading && (
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>Downloading...</span>
                <span>{downloadProgress}%</span>
              </div>
              <progress
                className="progress progress-primary w-full"
                value={downloadProgress}
                max="100"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            {!readyToInstall && !downloading && (
              <>
                <button
                  onClick={handleDismiss}
                  className="btn btn-ghost"
                >
                  Later
                </button>
                <button
                  onClick={handleDownload}
                  className="btn btn-primary"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Update
                </button>
              </>
            )}

            {readyToInstall && (
              <>
                <button
                  onClick={handleDismiss}
                  className="btn btn-ghost"
                >
                  Install on Next Launch
                </button>
                <button
                  onClick={handleInstall}
                  className="btn btn-primary"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Restart & Install
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};
