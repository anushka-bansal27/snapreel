package com.example.ui.screens

import android.app.Activity
import android.content.Context
import android.content.Intent
import com.example.R

fun openAndroidShareChooser(context: Context, title: String, shareUrl: String) {
    val sendIntent = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_SUBJECT, title)
        putExtra(Intent.EXTRA_TEXT, "$title\n$shareUrl")
    }
    val chooser = Intent.createChooser(sendIntent, context.getString(R.string.share))
    if (context !is Activity) {
        chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    context.startActivity(chooser)
}
