package com.clapfinder.app

import android.app.Application
import android.util.Log

class ClapFinderApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        Log.i("ClapFinderApplication", "Clap Finder Application Initialized (Package: com.clapfinder.app)")
    }
}
