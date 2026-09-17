document.addEventListener('DOMContentLoaded', () => {
  // Security Authentication Check & Profile Onboarding Redirection
  let sessionUser = null;

  const isSupabaseConfigured = window.supabaseClient && !window.supabaseClient.supabaseUrl.includes('YOUR_PROJECT_REF');

  const updateSyncStatus = (status) => {
    const el = document.getElementById('globalSyncStatus');
    if (!el) return;
    
    let bg = 'rgba(42, 157, 143, 0.1)';
    let color = 'var(--mint-green)';
    let text = 'Cloud Sync Active';
    
    if (status === 'syncing') {
      bg = 'rgba(250, 177, 160, 0.15)';
      color = '#e17055';
      text = 'Syncing...';
    } else if (status === 'offline') {
      bg = 'rgba(74, 74, 74, 0.1)';
      color = 'var(--text-muted)';
      text = 'Offline';
    } else if (status === 'failed') {
      bg = 'rgba(244, 63, 94, 0.1)';
      color = '#f43f5e';
      text = 'Sync Failed';
    }
    
    el.style.backgroundColor = bg;
    el.style.color = color;
    el.innerHTML = `<span style="width: 8px; height: 8px; border-radius: 50%; background: ${color};"></span> ${text}`;
  };

  const mapDbToJs = (dbProfile) => {
    if (!dbProfile) return {};
    return {
      fullName: dbProfile.full_name,
      dob: dbProfile.dob,
      phoneNumber: dbProfile.phone_number,
      personalEmail: dbProfile.personal_email,
      parentName: dbProfile.parent_name,
      parentRelation: dbProfile.parent_relation,
      parentEmail: dbProfile.parent_email,
      parentPhone: dbProfile.parent_phone,
      address1: dbProfile.address1,
      address2: dbProfile.address2,
      address3: dbProfile.address3,
      locality: dbProfile.locality,
      landmark: dbProfile.landmark,
      collegeName: dbProfile.college_name,
      courseInfo: dbProfile.course_info,
      degreePref: dbProfile.degree_pref,
      studyingYear: dbProfile.studying_year,
      regNo: dbProfile.reg_no,
      rollNo: dbProfile.roll_no,
      collegeEmail: dbProfile.college_email,
      numericRoll: dbProfile.numeric_roll,
      profileCompletion: dbProfile.profile_completion,
      onboardingComplete: dbProfile.onboarding_complete
    };
  };

  const mapJsToDb = (profile) => {
    if (!profile) return {};
    return {
      user_id: sessionUser.userId,
      full_name: profile.fullName || '',
      dob: profile.dob || null,
      phone_number: profile.phoneNumber || '',
      personal_email: profile.personalEmail || '',
      parent_name: profile.parentName || '',
      parent_relation: profile.parentRelation || '',
      parent_email: profile.parentEmail || '',
      parent_phone: profile.parentPhone || '',
      address1: profile.address1 || '',
      address2: profile.address2 || '',
      address3: profile.address3 || '',
      locality: profile.locality || '',
      landmark: profile.landmark || '',
      college_name: profile.collegeName || '',
      course_info: profile.courseInfo || '',
      degree_pref: profile.degreePref || '',
      studying_year: profile.studyingYear || '',
      reg_no: profile.regNo || '',
      roll_no: profile.rollNo || '',
      college_email: profile.collegeEmail || '',
      numeric_roll: profile.numericRoll || '',
      profile_completion: profile.profileCompletion || 100,
      onboarding_complete: profile.onboardingComplete !== false
    };
  };

  const syncProfileToRootKeys = (profile) => {
    if (!profile) return;
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const cleanProfile = { ...profile };
      delete cleanProfile.userId;
      delete cleanProfile.onboardingComplete;
      chrome.storage.local.set(cleanProfile);
    } else {
      Object.keys(profile).forEach(key => {
        if (key !== 'userId' && key !== 'onboardingComplete' && profile[key] !== undefined) {
          localStorage.setItem(key, profile[key]);
        }
      });
    }
  };

  const checkAuth = async () => {
    const handleLocalFallback = () => {
      const logged = localStorage.getItem('isLoggedIn') === 'true';
      const sessStr = localStorage.getItem('ccSession');
      const sess = sessStr ? JSON.parse(sessStr) : null;
      const profiles = JSON.parse(localStorage.getItem('studentProfiles') || '{}');
      
      if (!logged || !sess) {
        window.location.href = 'agent/login-panel.html';
        return;
      }
      sessionUser = sess;
      
      const userProfile = profiles[sess.userId] || {};
      if (userProfile.onboardingComplete !== true) {
        window.location.href = 'onboarding.html';
        return;
      }
      
      finalizeInit(userProfile);
    };

    const finalizeInit = (profile) => {
      syncProfileToRootKeys(profile);
      
      const subtitleEl = document.getElementById('viewSubtitle');
      if (subtitleEl) {
        subtitleEl.innerText = `Welcome back, ${sessionUser.name.split(' ')[0]} 👋`;
      }
      
      const nameEl = document.getElementById('dashUserNameText');
      const emailEl = document.getElementById('dashUserEmailText');
      const completionEl = document.getElementById('dashCompletionBadge');

      if (nameEl) nameEl.innerText = sessionUser.name;
      if (emailEl) emailEl.innerText = sessionUser.email;
      
      loadProfileAvatar();

      if (completionEl && profile) {
        completionEl.innerText = `Profile Completion: ${profile.profileCompletion || 100}%`;
      }

      // Load Profile Data after user session details have initialized
      loadProfileData();
    };

    if (isSupabaseConfigured) {
      try {
        const { data: { session }, error } = await window.supabaseClient.auth.getSession();
        if (error || !session) {
          window.location.href = 'agent/login-panel.html';
          return;
        }
        
        sessionUser = {
          userId: session.user.id,
          name: session.user.user_metadata.full_name || 'Campus Student',
          email: session.user.email,
          picture: session.user.user_metadata.avatar_url || '',
          provider: session.user.app_metadata.provider || 'supabase',
          supabaseToken: session.access_token
        };
        
        // Query Supabase for student profile completeness
        const { data: profile, error: profileErr } = await window.supabaseClient
          .from('student_profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
          
        if (profileErr && profileErr.code !== 'PGRST116') {
          throw profileErr;
        }
        
        if (!profile || !profile.onboarding_complete) {
          window.location.href = 'onboarding.html';
          return;
        }
        
        const mappedProfile = mapDbToJs(profile);
        finalizeInit(mappedProfile);
      } catch (err) {
        console.error('Supabase auth validation error, falling back:', err.message);
        handleLocalFallback();
      }
    } else {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['isLoggedIn', 'ccSession', 'studentProfiles'], (data) => {
          if (!data.isLoggedIn || !data.ccSession) {
            window.location.href = 'agent/login-panel.html';
            return;
          }
          sessionUser = data.ccSession;
          const profiles = data.studentProfiles || {};
          const profile = profiles[sessionUser.userId] || {};
          if (profile.onboardingComplete !== true) {
            window.location.href = 'onboarding.html';
            return;
          }
          finalizeInit(profile);
        });
      } else {
        handleLocalFallback();
      }
    }
  };

  // 1. Navigation Panel Routing with Hash History support
  const navItems = document.querySelectorAll('.nav-item');
  const tabPanels = document.querySelectorAll('.tab-panel');
  const viewTitle = document.getElementById('viewTitle');
  const viewSubtitle = document.getElementById('viewSubtitle');

  const tabMeta = {
    'tab-dashboard': { title: 'Dashboard', subtitle: 'Your forms, deadlines and student information — organized in one place.' },
    'tab-features': { title: 'Features Overview', subtitle: 'Everything you need to eliminate repetitive form filling.' },
    'tab-settings-hub': { title: 'Settings', subtitle: 'Manage your Campus Copilot preferences and vault credentials.' },
    'tab-reviews-hub': { title: 'Reviews Vault', subtitle: 'Store pre-filled opinions on mess, hostel, Wi-Fi, and faculty.' },
    'tab-about': { title: 'About Campus Copilot', subtitle: 'Meet the AI-powered student productivity assistant.' }
  };

  const handleRouting = (hash) => {
    const cleanHash = (hash || '').split('?')[0].split('/')[0];
    let targetTab = 'tab-dashboard';
    if (cleanHash === '#features') targetTab = 'tab-features';
    else if (cleanHash === '#settings') targetTab = 'tab-settings-hub';
    else if (cleanHash === '#reviews') targetTab = 'tab-reviews-hub';
    else if (cleanHash === '#about') targetTab = 'tab-about';

    navItems.forEach(i => i.classList.remove('active'));
    tabPanels.forEach(p => p.classList.remove('active'));

    const activeItem = document.querySelector(`.nav-item[data-tab="${targetTab}"]`);
    if (activeItem) activeItem.classList.add('active');

    const targetPanel = document.getElementById(targetTab);
    if (targetPanel) targetPanel.classList.add('active');

    if (tabMeta[targetTab]) {
      viewTitle.innerText = tabMeta[targetTab].title;
      viewSubtitle.innerText = tabMeta[targetTab].subtitle;
    }
  };

  navItems.forEach(item => {
    const tabId = item.getAttribute('data-tab');
    if (!tabId) return; // Skip logoutBtn or other items without data-tab attribute

    item.addEventListener('click', () => {
      let hash = '#dashboard';
      if (tabId === 'tab-features') hash = '#features';
      else if (tabId === 'tab-settings-hub') hash = '#settings';
      else if (tabId === 'tab-reviews-hub') hash = '#reviews';
      else if (tabId === 'tab-about') hash = '#about';

      window.location.hash = hash;
      handleRouting(hash); // Direct call for immediate updates
    });
  });

  window.addEventListener('hashchange', () => {
    handleRouting(window.location.hash);
  });

  // Run initial routing on load
  if (!window.location.hash) {
    // Check if user set a custom startup page
    const customLanding = localStorage.getItem('prefLanding') || 'dashboard';
    window.location.hash = '#' + customLanding;
    handleRouting('#' + customLanding);
  } else {
    handleRouting(window.location.hash);
  }

  // 2. Settings Hub Subtab Navigation Router
  const settingsSubNavItems = document.querySelectorAll('.settings-nav-item');
  const settingsSubPanels = document.querySelectorAll('.settings-sub-panel');

  settingsSubNavItems.forEach(item => {
    item.addEventListener('click', () => {
      settingsSubNavItems.forEach(i => i.classList.remove('active'));
      settingsSubPanels.forEach(p => p.classList.remove('active'));

      item.classList.add('active');
      const subPanelId = item.getAttribute('data-subtab');
      const targetSubPanel = document.getElementById(subPanelId);
      if (targetSubPanel) targetSubPanel.classList.add('active');
    });
  });

  // 3. Dynamic Profile Completion Calculations
  const profileFieldsList = [
    'fullName', 'dob', 'phoneNumber', 'personalEmail',
    'parentName', 'parentRelation', 'parentEmail', 'parentPhone',
    'address1', 'address2', 'address3', 'locality', 'landmark',
    'collegeName', 'courseInfo', 'degreePref', 'studyingYear',
    'regNo', 'rollNo', 'collegeEmail', 'numericRoll'
  ];

  function calculateProfileCompletion() {
    let filled = 0;
    const total = profileFieldsList.length;
    profileFieldsList.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.value.trim() !== '') {
        filled++;
      }
    });

    const percent = Math.round((filled / total) * 100);
    
    // Update dashboard widgets
    const pctValueEl = document.getElementById('completionPctValue');
    const progressBar = document.getElementById('dashProgressBar');
    const badgeEl = document.getElementById('dashCompletionBadge');

    if (pctValueEl) pctValueEl.innerText = `${percent}%`;
    if (progressBar) progressBar.style.width = `${percent}%`;
    if (badgeEl) badgeEl.innerText = `Profile Completion: ${percent}%`;

    // Update CTA button state
    const completeProfileBtn = document.getElementById('dashCompleteProfileBtn');
    if (completeProfileBtn) {
      if (percent >= 100) {
        completeProfileBtn.innerText = 'Edit Profile';
        completeProfileBtn.classList.remove('btn-primary');
        completeProfileBtn.classList.add('btn-secondary');
      } else {
        completeProfileBtn.innerText = 'Complete Profile';
        completeProfileBtn.classList.remove('btn-secondary');
        completeProfileBtn.classList.add('btn-primary');
      }
    }

    // Persist percentage inside profile registry
    if (sessionUser) {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['studentProfiles'], (result) => {
          const profiles = result.studentProfiles || {};
          if (profiles[sessionUser.userId]) {
            profiles[sessionUser.userId].profileCompletion = percent;
            chrome.storage.local.set({ studentProfiles: profiles });
          }
        });
      } else {
        const profiles = JSON.parse(localStorage.getItem('studentProfiles') || '{}');
        if (profiles[sessionUser.userId]) {
          profiles[sessionUser.userId].profileCompletion = percent;
          localStorage.setItem('studentProfiles', JSON.stringify(profiles));
        }
      }
    }
  }

  // Complete Profile CTA redirect with empty fields highlight
  document.getElementById('dashCompleteProfileBtn')?.addEventListener('click', () => {
    window.location.hash = '#settings';
    
    // Auto click student profile sub-tab in settings
    const profileSubTab = document.querySelector('.settings-nav-item[data-subtab="settings-profile"]');
    if (profileSubTab) profileSubTab.click();

    // Highlight missing fields if any
    setTimeout(() => {
      let highlighted = 0;
      profileFieldsList.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.value.trim() === '') {
          el.style.outline = '2px solid #FF7675';
          el.style.borderRadius = '6px';
          el.addEventListener('focus', () => {
            el.style.outline = '';
          }, { once: true });
          highlighted++;
        }
      });
      if (highlighted > 0) {
        showToast('Please fill in the highlighted missing information.', 'warning');
      }
    }, 400);
  });

  // 4. Toast Notifications System
  function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    // Toast Toggle Settings check
    const toggleToasts = document.getElementById('toggleToasts');
    if (toggleToasts && !toggleToasts.checked) return;

    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    if (type === 'error') {
      toast.style.background = '#FF7675';
    } else if (type === 'warning') {
      toast.style.background = '#E17055';
    }

    const icon = type === 'success' ? '✓' : '⚠️';
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        toast.remove();
      }, 500);
    }, 2800);
  }

  // 5. Backdrop Modal Dialog Helper
  let modalConfirmCallback = null;
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modalTitle = document.getElementById('modalTitle');
  const modalMessage = document.getElementById('modalMessage');

  function openConfirmationModal(title, msg, onConfirm) {
    if (!modalBackdrop) return;
    modalTitle.innerText = title;
    modalMessage.innerText = msg;
    modalConfirmCallback = onConfirm;
    modalBackdrop.style.display = 'flex';
  }

  function closeConfirmationModal() {
    if (modalBackdrop) modalBackdrop.style.display = 'none';
    modalConfirmCallback = null;
  }

  document.getElementById('modalCancelBtn')?.addEventListener('click', closeConfirmationModal);
  document.getElementById('modalConfirmBtn')?.addEventListener('click', () => {
    if (modalConfirmCallback) modalConfirmCallback();
    closeConfirmationModal();
  });

  // 6. Data Synchronization & Persistence Setup
  const fieldIds = [
    'geminiApiKey', 'modelSelect', 'fullName', 'rollNo', 'numericRoll', 'phoneNumber',
    'gradYear', 'batchSection', 'collegeEmail', 'sentimentSlider',
    'sentimentNotes', 'hostelRoom', 'waterFeedback', 'hostelWifiFeedback', 'cleanlinessFeedback',
    'messRatingSlider', 'foodQualityFeedback', 'facultyFeedback', 'clubInterests',
    'dob', 'personalEmail',
    'parentName', 'parentRelation', 'parentEmail', 'parentPhone',
    'address1', 'address2', 'address3', 'locality', 'landmark',
    'collegeName', 'courseInfo', 'degreePref', 'studyingYear',
    'currentPasscode', 'newPasscode'
  ];

  // Auto-save draft values for settings inputs
  const saveSettingsDraft = () => {
    if (!sessionUser) return;
    const draftData = {};
    const excludedDraftIds = ['currentPasscode', 'newPasscode', 'geminiApiKey'];
    fieldIds.forEach(id => {
      if (excludedDraftIds.includes(id)) return;
      const el = document.getElementById(id);
      if (el) draftData[id] = el.value.trim();
    });
    localStorage.setItem('ccDraftProfile_' + sessionUser.userId, JSON.stringify(draftData));
  };

  const restoreSettingsDraft = () => {
    if (!sessionUser) return;
    const draftStr = localStorage.getItem('ccDraftProfile_' + sessionUser.userId);
    if (!draftStr) return;
    try {
      const draftData = JSON.parse(draftStr);
      let restoredCount = 0;
      Object.keys(draftData).forEach(id => {
        const el = document.getElementById(id);
        if (el && draftData[id] && el.value.trim() !== draftData[id]) {
          el.value = draftData[id];
          restoredCount++;
        }
      });
      if (restoredCount > 0) {
        showToast('Unsaved information restored.');
      }
    } catch (e) {
      console.error("Failed to restore settings draft", e);
    }
  };

  const setupDraftAutoSave = () => {
    if (!sessionUser) return;
    const excludedDraftIds = ['currentPasscode', 'newPasscode', 'geminiApiKey'];
    fieldIds.forEach(id => {
      if (excludedDraftIds.includes(id)) return;
      const el = document.getElementById(id);
      if (el) {
        el.removeEventListener('input', saveSettingsDraft);
        el.addEventListener('input', saveSettingsDraft);
      }
    });
  };

  const loadProfileData = async () => {
    const overlay = document.getElementById('profileLoadingOverlay');
    if (overlay) {
      overlay.style.display = 'flex';
      overlay.style.opacity = '1';
    }

    const handleLoadedData = (userProfile, reviewsData, settingsData) => {
      try {
        if (!sessionUser) {
          throw new Error("Session is not active.");
        }

        fieldIds.forEach(id => {
          const el = document.getElementById(id);
          if (el) {
            if (userProfile[id] !== undefined) {
              el.value = userProfile[id];
            } else if (reviewsData && reviewsData[id] !== undefined) {
              el.value = reviewsData[id];
            } else {
              el.value = '';
            }
          }
        });

        if (userProfile.sentimentSlider) {
          const valEl = document.getElementById('sentimentValue');
          if (valEl) valEl.innerText = `${userProfile.sentimentSlider} / 5`;
        }
        if (reviewsData && reviewsData.messRatingSlider) {
          const valEl = document.getElementById('messRatingValue');
          if (valEl) valEl.innerText = `${reviewsData.messRatingSlider} / 5`;
        }

        // 2. Load settings and apply UI overrides
        if (settingsData) {
          // Theme
          const theme = settingsData.theme || 'light';
          localStorage.setItem('appTheme', theme);
          document.querySelectorAll('input[name="themeSelect"]').forEach(radio => {
            radio.checked = radio.value === theme;
          });
          applyTheme(theme);

          // Accent
          const accent = settingsData.accent_color || 'default';
          localStorage.setItem('appAccent', accent);
          document.querySelectorAll('.accent-color-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.accent === accent);
          });
          applyAccent(accent);

          // Density
          const density = settingsData.density || 'comfortable';
          localStorage.setItem('appDensity', density);
          document.querySelectorAll('.density-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.density === density);
          });
          applyDensity(density);

          // Load other settings switches
          const switches = settingsData.switches || {};
          Object.keys(switches).forEach(key => {
            localStorage.setItem(key, switches[key]);
            const el = document.getElementById(key);
            if (el) el.checked = switches[key] !== false;
          });

          // Dropdowns
          if (settingsData.pref_language) {
            localStorage.setItem('prefLanguage', settingsData.pref_language);
            if (prefLanguage) prefLanguage.value = settingsData.pref_language;
          }
          if (settingsData.pref_landing) {
            localStorage.setItem('prefLanding', settingsData.pref_landing);
            if (prefLanding) prefLanding.value = settingsData.pref_landing;
          }
          if (settingsData.select_ai_mode) {
            localStorage.setItem('selectAiMode', settingsData.select_ai_mode);
            if (selectAiMode) selectAiMode.value = settingsData.select_ai_mode;
          }
        }

        // Restore unsaved draft changes
        restoreSettingsDraft();

        // Bind auto-save listeners on all profile inputs
        setupDraftAutoSave();

        // Calculate dynamic completion rate
        calculateProfileCompletion();

        // Fade out overlay
        if (overlay) {
          setTimeout(() => {
            overlay.style.opacity = '0';
            setTimeout(() => {
              overlay.style.display = 'none';
            }, 300);
          }, 300);
        }
      } catch (err) {
        console.error("Failed to load user profile", err);
      }
    };

    if (isSupabaseConfigured) {
      updateSyncStatus('syncing');
      try {
        // Fetch student profile
        const { data: dbProfile, error: profileErr } = await window.supabaseClient
          .from('student_profiles')
          .select('*')
          .eq('user_id', sessionUser.userId)
          .single();

        // Fetch settings
        const { data: dbSettings, error: settingsErr } = await window.supabaseClient
          .from('user_settings')
          .select('*')
          .eq('user_id', sessionUser.userId)
          .single();

        // Fetch reviews
        const { data: dbReviews, error: reviewsErr } = await window.supabaseClient
          .from('reviews')
          .select('*')
          .eq('user_id', sessionUser.userId)
          .single();

        // Check if profile exists. If not, trigger migration from local storage!
        if (!dbProfile) {
          console.log('No cloud profile found, initiating local data migration...');
          await migrateLocalDataToCloud();
          // After migration, reload profile data
          loadProfileData();
          return;
        }

        // Parse tables into expected structures
        const mappedProfile = mapDbToJs(dbProfile);
        
        // Map reviews from db fields back to payload keys
        const reviews = dbReviews ? {
          hostelRoom: dbReviews.hostel_room,
          waterFeedback: dbReviews.water_feedback,
          hostelWifiFeedback: dbReviews.hostel_wifi_feedback,
          cleanlinessFeedback: dbReviews.cleanliness_feedback,
          messRatingSlider: dbReviews.mess_rating_slider,
          foodQualityFeedback: dbReviews.food_quality_feedback,
          facultyFeedback: dbReviews.faculty_feedback,
          clubInterests: dbReviews.club_interests
        } : {};

        // Load forms history and update stats dynamically
        await loadFormHistoryAndStats();

        // Synchronize local chrome cache for extension auto-fill
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          const profileRegistry = {};
          profileRegistry[sessionUser.userId] = {
            ...mappedProfile,
            ...reviews
          };
          chrome.storage.local.set({
            studentProfiles: profileRegistry,
            ...mappedProfile,
            ...reviews
          });
        }

        handleLoadedData(mappedProfile, reviews, dbSettings);
        updateSyncStatus('active');
      } catch (err) {
        console.error('Supabase load profile error:', err.message);
        updateSyncStatus('failed');
        loadLocalDataFallback(handleLoadedData);
      }
    } else {
      loadLocalDataFallback(handleLoadedData);
    }
  };

  const migrateLocalDataToCloud = async () => {
    if (!isSupabaseConfigured) return;
    
    // Retrieve local storage registry
    let localProfile = {};
    let localReviews = {};
    
    const storeToCloud = async (profiles) => {
      const userProfile = profiles[sessionUser.userId] || {};
      
      // If no local onboarding profile is complete, we can't migrate yet
      if (!userProfile.onboardingComplete) {
        console.log('No local complete profile to migrate.');
        return;
      }
      
      // Map and write to student_profiles
      const dbProfile = {
        user_id: sessionUser.userId,
        full_name: userProfile.fullName || '',
        dob: userProfile.dob || null,
        phone_number: userProfile.phoneNumber || '',
        personal_email: userProfile.personalEmail || '',
        parent_name: userProfile.parentName || '',
        parent_relation: userProfile.parentRelation || '',
        parent_email: userProfile.parentEmail || '',
        parent_phone: userProfile.parentPhone || '',
        address1: userProfile.address1 || '',
        address2: userProfile.address2 || '',
        address3: userProfile.address3 || '',
        locality: userProfile.locality || '',
        landmark: userProfile.landmark || '',
        college_name: userProfile.collegeName || '',
        course_info: userProfile.courseInfo || '',
        degree_pref: userProfile.degreePref || '',
        studying_year: userProfile.studyingYear || '',
        reg_no: userProfile.regNo || '',
        roll_no: userProfile.rollNo || '',
        college_email: userProfile.collegeEmail || '',
        numeric_roll: userProfile.numericRoll || '',
        profile_completion: userProfile.profileCompletion || 100,
        onboarding_complete: true
      };

      const { error: profileErr } = await window.supabaseClient
        .from('student_profiles')
        .upsert(dbProfile, { onConflict: 'user_id' });
        
      if (profileErr) throw profileErr;
      
      // Map and write to user_settings
      const switches = {};
      switchIds.forEach(id => {
        const val = localStorage.getItem(id);
        if (val !== null) switches[id] = val === 'true';
      });

      const dbSettings = {
        user_id: sessionUser.userId,
        theme: localStorage.getItem('appTheme') || 'light',
        accent_color: localStorage.getItem('appAccent') || 'default',
        density: localStorage.getItem('appDensity') || 'comfortable',
        pref_language: localStorage.getItem('prefLanguage') || 'en',
        pref_landing: localStorage.getItem('prefLanding') || 'dashboard',
        select_ai_mode: localStorage.getItem('selectAiMode') || 'balanced',
        switches: switches
      };

      const { error: settingsErr } = await window.supabaseClient
        .from('user_settings')
        .upsert(dbSettings, { onConflict: 'user_id' });

      if (settingsErr) throw settingsErr;

      // Map and write to reviews
      const dbReviews = {
        user_id: sessionUser.userId,
        hostel_room: localStorage.getItem('hostelRoom') || userProfile.hostelRoom || '',
        water_feedback: localStorage.getItem('waterFeedback') || userProfile.waterFeedback || '',
        hostel_wifi_feedback: localStorage.getItem('hostelWifiFeedback') || userProfile.hostelWifiFeedback || '',
        cleanliness_feedback: localStorage.getItem('cleanlinessFeedback') || userProfile.cleanlinessFeedback || '',
        mess_rating_slider: parseInt(localStorage.getItem('messRatingSlider') || userProfile.messRatingSlider || '3'),
        food_quality_feedback: localStorage.getItem('foodQualityFeedback') || userProfile.foodQualityFeedback || '',
        faculty_feedback: localStorage.getItem('facultyFeedback') || userProfile.facultyFeedback || '',
        club_interests: localStorage.getItem('clubInterests') || userProfile.clubInterests || ''
      };

      const { error: reviewsErr } = await window.supabaseClient
        .from('reviews')
        .upsert(dbReviews, { onConflict: 'user_id' });

      if (reviewsErr) throw reviewsErr;
      
      // Migrate form history (if local history exists)
      const localHistory = JSON.parse(localStorage.getItem('formHistory') || '[]');
      if (localHistory && localHistory.length > 0) {
        const dbHistory = localHistory.map(h => ({
          user_id: sessionUser.userId,
          form_url: h.formUrl,
          form_title: h.formTitle,
          domain: h.domain,
          fields_detected: h.fieldsDetected,
          fields_filled: h.fieldsFilled,
          time_saved_seconds: h.timeSavedSeconds,
          status: h.status,
          created_at: h.createdAt
        }));
        
        await window.supabaseClient
          .from('form_history')
          .insert(dbHistory);
      }
      
      console.log('Local data successfully migrated to Supabase Cloud Database!');
      showToast('Offline profile migrated to Cloud Vault.');
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return new Promise((resolve, reject) => {
        chrome.storage.local.get(['studentProfiles'], async (result) => {
          try {
            await storeToCloud(result.studentProfiles || {});
            resolve();
          } catch (err) {
            reject(err);
          }
        });
      });
    } else {
      const profiles = JSON.parse(localStorage.getItem('studentProfiles') || '{}');
      await storeToCloud(profiles);
    }
  };

  const loadFormHistoryAndStats = async () => {
    if (!isSupabaseConfigured) return;
    
    // Sync any unsynced local form history entries
    const localHistory = JSON.parse(localStorage.getItem('formHistory') || '[]');
    if (localHistory && localHistory.length > 0) {
      console.log('Syncing local form history to cloud...');
      const dbHistory = localHistory.map(h => ({
        user_id: sessionUser.userId,
        form_url: h.formUrl,
        form_title: h.formTitle,
        domain: h.domain,
        fields_detected: h.fieldsDetected,
        fields_filled: h.fieldsFilled,
        time_saved_seconds: h.timeSavedSeconds,
        status: h.status,
        created_at: h.createdAt
      }));
      
      const { error } = await window.supabaseClient
        .from('form_history')
        .insert(dbHistory);
        
      if (!error) {
        // Clear local unsynced history cache
        localStorage.removeItem('formHistory');
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.remove(['formHistory']);
        }
      }
    }

    // Fetch form history count & aggregate fields filled/time saved
    const { data: history, error: historyErr } = await window.supabaseClient
      .from('form_history')
      .select('*')
      .eq('user_id', sessionUser.userId)
      .order('created_at', { ascending: false });

    if (historyErr) throw historyErr;

    const totalForms = history.length;
    let totalFields = 0;
    let totalTimeSavedSeconds = 0;
    
    history.forEach(item => {
      totalFields += (item.fields_filled || 0);
      totalTimeSavedSeconds += (item.time_saved_seconds || 0);
    });

    const formsAssistedEl = document.getElementById('statFormsAssisted');
    const fieldsFilledEl = document.getElementById('statFieldsFilled');
    const timeSavedEl = document.getElementById('statTimeSaved');

    if (formsAssistedEl) formsAssistedEl.innerText = totalForms;
    if (fieldsFilledEl) fieldsFilledEl.innerText = totalFields;
    
    if (timeSavedEl) {
      if (totalTimeSavedSeconds >= 3600) {
        const hours = Math.floor(totalTimeSavedSeconds / 3600);
        const mins = Math.round((totalTimeSavedSeconds % 3600) / 60);
        timeSavedEl.innerText = `${hours}h ${mins}m`;
      } else {
        const mins = Math.round(totalTimeSavedSeconds / 60);
        timeSavedEl.innerText = `${mins}m`;
      }
    }

    // Populate Completed Forms Table
    const tbody = document.getElementById('recentFormsTableBody');
    if (tbody) {
      tbody.innerHTML = '';
      if (totalForms === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 13.5px;">No forms completed yet. Click "Try a Demo Form" to start!</td></tr>`;
        return;
      }
      
      history.slice(0, 10).forEach(item => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid rgba(74,74,74,0.06)';
        tr.style.cursor = 'pointer';
        tr.className = 'form-row-item';
        tr.dataset.formId = item.id;
        
        const dateStr = new Date(item.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });

        let statusBg = 'rgba(42, 157, 143, 0.1)';
        let statusColor = 'var(--mint-green)';
        if (item.status === 'Needs Review') {
          statusBg = 'rgba(250, 177, 160, 0.2)';
          statusColor = '#E17055';
        } else if (item.status === 'In Progress') {
          statusBg = 'rgba(74, 74, 74, 0.08)';
          statusColor = 'var(--text-muted)';
        }

        tr.innerHTML = `
          <td style="padding: 14px 8px; font-size: 13.5px; font-weight: 700; color: var(--text-main);">${item.form_title || 'Google Form'}</td>
          <td style="padding: 14px 8px; font-size: 13px; color: var(--text-muted);">${dateStr}</td>
          <td style="padding: 14px 8px; font-size: 13px; color: var(--text-muted);">${item.fields_filled} Fields</td>
          <td style="padding: 14px 8px;"><span style="background: ${statusBg}; color: ${statusColor}; padding: 4px 8px; border-radius: 99px; font-size: 11px; font-weight: 700;">${item.status || 'Completed'}</span></td>
          <td style="padding: 14px 8px; text-align: right;"><button class="btn btn-secondary view-form-detail-btn" style="padding: 4px 10px; font-size: 11.5px;">View</button></td>
        `;
        tbody.appendChild(tr);
      });
    }
  };

  const loadLocalDataFallback = (handleLoadedData) => {
    const handleLocal = (studentProfiles) => {
      const profiles = studentProfiles || {};
      const userProfile = profiles[sessionUser.userId] || {};
      
      const reviews = {
        hostelRoom: localStorage.getItem('hostelRoom') || userProfile.hostelRoom || '',
        waterFeedback: localStorage.getItem('waterFeedback') || userProfile.waterFeedback || '',
        hostelWifiFeedback: localStorage.getItem('hostelWifiFeedback') || userProfile.hostelWifiFeedback || '',
        cleanlinessFeedback: localStorage.getItem('cleanlinessFeedback') || userProfile.cleanlinessFeedback || '',
        messRatingSlider: localStorage.getItem('messRatingSlider') || userProfile.messRatingSlider || '3',
        foodQualityFeedback: localStorage.getItem('foodQualityFeedback') || userProfile.foodQualityFeedback || '',
        facultyFeedback: localStorage.getItem('facultyFeedback') || userProfile.facultyFeedback || '',
        clubInterests: localStorage.getItem('clubInterests') || userProfile.clubInterests || ''
      };

      const settingsData = {
        theme: localStorage.getItem('appTheme') || 'light',
        accent_color: localStorage.getItem('appAccent') || 'default',
        density: localStorage.getItem('appDensity') || 'comfortable',
        pref_language: localStorage.getItem('prefLanguage') || 'en',
        pref_landing: localStorage.getItem('prefLanding') || 'dashboard',
        select_ai_mode: localStorage.getItem('selectAiMode') || 'balanced',
        switches: {}
      };
      
      switchIds.forEach(id => {
        settingsData.switches[id] = localStorage.getItem(id) !== 'false';
      });

      const localHistory = JSON.parse(localStorage.getItem('formHistory') || '[]');
      const formsAssistedEl = document.getElementById('statFormsAssisted');
      const fieldsFilledEl = document.getElementById('statFieldsFilled');
      const timeSavedEl = document.getElementById('statTimeSaved');

      if (formsAssistedEl) formsAssistedEl.innerText = localHistory.length;
      let totalFields = 0;
      let totalTimeSaved = 0;
      localHistory.forEach(h => {
        totalFields += (h.fieldsFilled || 0);
        totalTimeSaved += (h.timeSavedSeconds || 0);
      });
      if (fieldsFilledEl) fieldsFilledEl.innerText = totalFields;
      if (timeSavedEl) {
        if (totalTimeSaved >= 3600) {
          timeSavedEl.innerText = `${Math.floor(totalTimeSaved / 3600)}h ${Math.round((totalTimeSaved % 3600) / 60)}m`;
        } else {
          timeSavedEl.innerText = `${Math.round(totalTimeSaved / 60)}m`;
        }
      }

      const tbody = document.getElementById('recentFormsTableBody');
      if (tbody) {
        tbody.innerHTML = '';
        if (localHistory.length === 0) {
          tbody.innerHTML = `
            <tr style="border-bottom: 1px solid rgba(74,74,74,0.06); cursor: pointer;" class="form-row-item" data-form="mass-review">
              <td style="padding: 14px 8px; font-size: 13.5px; font-weight: 700; color: var(--text-main);">Mass Review - Week 3</td>
              <td style="padding: 14px 8px; font-size: 13px; color: var(--text-muted);">Aug 25, 2026</td>
              <td style="padding: 14px 8px; font-size: 13px; color: var(--text-muted);">15 Fields</td>
              <td style="padding: 14px 8px;"><span style="background: rgba(42, 157, 143, 0.1); color: var(--mint-green); padding: 4px 8px; border-radius: 99px; font-size: 11px; font-weight: 700;">Completed</span></td>
              <td style="padding: 14px 8px; text-align: right;"><button class="btn btn-secondary view-form-detail-btn" style="padding: 4px 10px; font-size: 11.5px;">View</button></td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(74,74,74,0.06); cursor: pointer;" class="form-row-item" data-form="techfest">
              <td style="padding: 14px 8px; font-size: 13.5px; font-weight: 700; color: var(--text-main);">TechFest Registration</td>
              <td style="padding: 14px 8px; font-size: 13px; color: var(--text-muted);">Aug 24, 2026</td>
              <td style="padding: 14px 8px; font-size: 13px; color: var(--text-muted);">10 Fields</td>
              <td style="padding: 14px 8px;"><span style="background: rgba(42, 157, 143, 0.1); color: var(--mint-green); padding: 4px 8px; border-radius: 99px; font-size: 11px; font-weight: 700;">Completed</span></td>
              <td style="padding: 14px 8px; text-align: right;"><button class="btn btn-secondary view-form-detail-btn" style="padding: 4px 10px; font-size: 11.5px;">View</button></td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(74,74,74,0.06); cursor: pointer;" class="form-row-item" data-form="scholarship">
              <td style="padding: 14px 8px; font-size: 13.5px; font-weight: 700; color: var(--text-main);">Scholarship Application</td>
              <td style="padding: 14px 8px; font-size: 13px; color: var(--text-muted);">Aug 22, 2026</td>
              <td style="padding: 14px 8px; font-size: 13px; color: var(--text-muted);">45 Fields</td>
              <td style="padding: 14px 8px;"><span style="background: rgba(250, 177, 160, 0.2); color: #E17055; padding: 4px 8px; border-radius: 99px; font-size: 11px; font-weight: 700;">Needs Review</span></td>
              <td style="padding: 14px 8px; text-align: right;"><button class="btn btn-secondary view-form-detail-btn" style="padding: 4px 10px; font-size: 11.5px;">View</button></td>
            </tr>
            <tr style="border-bottom: 1px solid rgba(74,74,74,0.06); cursor: pointer;" class="form-row-item" data-form="internship">
              <td style="padding: 14px 8px; font-size: 13.5px; font-weight: 700; color: var(--text-main);">Internship Registration</td>
              <td style="padding: 14px 8px; font-size: 13px; color: var(--text-muted);">Aug 18, 2026</td>
              <td style="padding: 14px 8px; font-size: 13px; color: var(--text-muted);">22 Fields</td>
              <td style="padding: 14px 8px;"><span style="background: rgba(74, 74, 74, 0.08); color: var(--text-muted); padding: 4px 8px; border-radius: 99px; font-size: 11px; font-weight: 700;">In Progress</span></td>
              <td style="padding: 14px 8px; text-align: right;"><button class="btn btn-secondary view-form-detail-btn" style="padding: 4px 10px; font-size: 11.5px;">View</button></td>
            </tr>
          `;
        } else {
          localHistory.slice(0, 10).forEach(h => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(74,74,74,0.06)';
            tr.style.cursor = 'pointer';
            tr.className = 'form-row-item';
            
            const dateStr = new Date(h.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });

            tr.innerHTML = `
              <td style="padding: 14px 8px; font-size: 13.5px; font-weight: 700; color: var(--text-main);">${h.formTitle}</td>
              <td style="padding: 14px 8px; font-size: 13px; color: var(--text-muted);">${dateStr}</td>
              <td style="padding: 14px 8px; font-size: 13px; color: var(--text-muted);">${h.fieldsFilled} Fields</td>
              <td style="padding: 14px 8px;"><span style="background: rgba(42, 157, 143, 0.1); color: var(--mint-green); padding: 4px 8px; border-radius: 99px; font-size: 11px; font-weight: 700;">${h.status}</span></td>
              <td style="padding: 14px 8px; text-align: right;"><button class="btn btn-secondary view-form-detail-btn" style="padding: 4px 10px; font-size: 11.5px;">View</button></td>
            `;
            tbody.appendChild(tr);
          });
        }
      }

      handleLoadedData(userProfile, reviews, settingsData);
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['studentProfiles'], (data) => {
        handleLocal(data.studentProfiles || {});
      });
    } else {
      const profiles = JSON.parse(localStorage.getItem('studentProfiles') || '{}');
      handleLocal(profiles);
    }
  };

  document.getElementById('sentimentSlider')?.addEventListener('input', (e) => {
    document.getElementById('sentimentValue').innerText = `${e.target.value} / 5`;
  });

  document.getElementById('messRatingSlider')?.addEventListener('input', (e) => {
    document.getElementById('messRatingValue').innerText = `${e.target.value} / 5`;
  });

  // Save Settings Handlers
  async function saveProfileData() {
    const payload = {};
    fieldIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) payload[id] = el.value.trim();
    });
    payload.apiKey = payload.geminiApiKey;
    payload.studentProfile = { ...payload };

    const finalizeSave = () => {
      showToast('Profile saved successfully');
      calculateProfileCompletion();
      
      // Relock all cards
      const editCards = document.querySelectorAll('.card.in-edit-mode');
      editCards.forEach(card => {
        card.classList.remove('in-edit-mode');
        const inputs = card.querySelectorAll('input, textarea');
        inputs.forEach(input => input.setAttribute('readonly', 'true'));
      });
      const editBtns = document.querySelectorAll('.edit-toggle-btn');
      editBtns.forEach(btn => btn.classList.remove('active'));
    };

    const updateProfileRegistry = (profiles) => {
      if (sessionUser) {
        const updatedUser = {
          ...profiles[sessionUser.userId],
          ...payload,
          onboardingComplete: true
        };
        let filled = 0;
        profileFieldsList.forEach(id => {
          if (updatedUser[id] && updatedUser[id].trim() !== '') {
            filled++;
          }
        });
        updatedUser.profileCompletion = Math.round((filled / profileFieldsList.length) * 100);
        profiles[sessionUser.userId] = updatedUser;
      }
      return profiles;
    };

    if (sessionUser) {
      // Clear draft since it is saved
      localStorage.removeItem('ccDraftProfile_' + sessionUser.userId);
    }

    // Local Storage Save
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['studentProfiles'], (result) => {
        const updatedProfiles = updateProfileRegistry(result.studentProfiles || {});
        const rootSync = { ...payload };
        delete rootSync.currentPasscode;
        delete rootSync.newPasscode;
        
        chrome.storage.local.set({
          ...rootSync,
          studentProfiles: updatedProfiles
        }, () => {
          const profile = updatedProfiles[sessionUser.userId];
          if (profile) syncProfileToRootKeys(profile);
          finalizeSave();
        });
      });
    } else {
      const profiles = JSON.parse(localStorage.getItem('studentProfiles') || '{}');
      const updatedProfiles = updateProfileRegistry(profiles);
      localStorage.setItem('studentProfiles', JSON.stringify(updatedProfiles));
      
      const profile = updatedProfiles[sessionUser.userId];
      if (profile) syncProfileToRootKeys(profile);
      
      finalizeSave();
    }

    // Supabase Cloud Push
    if (isSupabaseConfigured) {
      updateSyncStatus('syncing');
      try {
        const dbData = mapJsToDb(payload);
        const { error: profileErr } = await window.supabaseClient
          .from('student_profiles')
          .upsert(dbData, { onConflict: 'user_id' });
          
        if (profileErr) throw profileErr;
        
        // Build settings switches payload
        const switches = {};
        switchIds.forEach(id => {
          const el = document.getElementById(id);
          if (el) switches[id] = el.checked;
        });

        const dbSettings = {
          user_id: sessionUser.userId,
          theme: localStorage.getItem('appTheme') || 'light',
          accent_color: localStorage.getItem('appAccent') || 'default',
          density: localStorage.getItem('appDensity') || 'comfortable',
          pref_language: localStorage.getItem('prefLanguage') || 'en',
          pref_landing: localStorage.getItem('prefLanding') || 'dashboard',
          select_ai_mode: localStorage.getItem('selectAiMode') || 'balanced',
          switches: switches
        };

        const { error: settingsErr } = await window.supabaseClient
          .from('user_settings')
          .upsert(dbSettings, { onConflict: 'user_id' });

        if (settingsErr) throw settingsErr;

        updateSyncStatus('active');
      } catch (err) {
        console.error('Supabase profile save failed:', err.message);
        updateSyncStatus('failed');
        showToast('Sync failed: Stored locally.', 'warning');
      }
    }
  }

  document.getElementById('profileSaveBtn')?.addEventListener('click', saveProfileData);
  document.getElementById('profileCancelBtn')?.addEventListener('click', () => {
    loadProfileData();
    showToast('Unsaved changes reverted.', 'warning');
    // Lock cards
    const editCards = document.querySelectorAll('.card.in-edit-mode');
    editCards.forEach(card => {
      card.classList.remove('in-edit-mode');
      const inputs = card.querySelectorAll('input, textarea');
      inputs.forEach(input => input.setAttribute('readonly', 'true'));
    });
    const editBtns = document.querySelectorAll('.edit-toggle-btn');
    editBtns.forEach(btn => btn.classList.remove('active'));
  });

  // Save Reviews Handlers
  document.getElementById('reviewsSaveBtn')?.addEventListener('click', async () => {
    const payload = {
      hostelRoom: document.getElementById('hostelRoom').value.trim(),
      waterFeedback: document.getElementById('waterFeedback').value.trim(),
      hostelWifiFeedback: document.getElementById('hostelWifiFeedback').value.trim(),
      cleanlinessFeedback: document.getElementById('cleanlinessFeedback').value.trim(),
      messRatingSlider: document.getElementById('messRatingSlider').value,
      foodQualityFeedback: document.getElementById('foodQualityFeedback').value.trim(),
      facultyFeedback: document.getElementById('facultyFeedback').value.trim(),
      clubInterests: document.getElementById('clubInterests').value.trim()
    };

    const finalize = () => showToast('Reviews Vault saved successfully!');

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set(payload, finalize);
    } else {
      Object.keys(payload).forEach(key => localStorage.setItem(key, payload[key]));
      finalize();
    }

    if (isSupabaseConfigured) {
      updateSyncStatus('syncing');
      try {
        const dbReviews = {
          user_id: sessionUser.userId,
          hostel_room: payload.hostelRoom,
          water_feedback: payload.waterFeedback,
          hostel_wifi_feedback: payload.hostelWifiFeedback,
          cleanliness_feedback: payload.cleanlinessFeedback,
          mess_rating_slider: parseInt(payload.messRatingSlider || '3'),
          food_quality_feedback: payload.foodQualityFeedback,
          faculty_feedback: payload.facultyFeedback,
          club_interests: payload.clubInterests
        };

        const { error } = await window.supabaseClient
          .from('reviews')
          .upsert(dbReviews, { onConflict: 'user_id' });

        if (error) throw error;
        updateSyncStatus('active');
      } catch (err) {
        console.error('Supabase reviews save failed:', err.message);
        updateSyncStatus('failed');
        showToast('Sync failed: Stored locally.', 'warning');
      }
    }
  });

  document.getElementById('reviewsCancelBtn')?.addEventListener('click', () => {
    loadProfileData();
    showToast('Review changes cancelled.', 'warning');
  });

  // Logout Click Handlers
  const triggerLogout = () => {
    openConfirmationModal('Sign Out Account', 'Are you sure you want to end your active session and log out?', () => {
      const handleLogout = () => {
        window.location.href = 'agent/login-panel.html';
      };

      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove(['isLoggedIn', 'ccSession'], handleLogout);
      } else {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('ccSession');
        handleLogout();
      }
    });
  };

  document.getElementById('logoutBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    triggerLogout();
  });
  document.getElementById('accSignOutBtn')?.addEventListener('click', triggerLogout);

  // Edit Mode Toggle Logic for Identity Cards
  const editToggleBtns = document.querySelectorAll('.edit-toggle-btn');
  editToggleBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const targetCardId = btn.getAttribute('data-target');
      const cardEl = document.getElementById(targetCardId);
      if (!cardEl) return;

      const isEditMode = cardEl.classList.toggle('in-edit-mode');
      const inputs = cardEl.querySelectorAll('input, textarea');
      btn.classList.toggle('active', isEditMode);

      if (isEditMode) {
        inputs.forEach(input => {
          input.removeAttribute('readonly');
          input.removeAttribute('disabled');
        });
        if (inputs.length > 0) inputs[0].focus();
      } else {
        inputs.forEach(input => {
          input.setAttribute('readonly', 'true');
        });
      }
    });
  });

  // Global "Click Outside to Lock" Document Listener
  document.addEventListener('click', (e) => {
    const editCards = document.querySelectorAll('.card.in-edit-mode');
    editCards.forEach(card => {
      const toggleBtn = document.querySelector(`.edit-toggle-btn[data-target="${card.id}"]`);
      if (!card.contains(e.target) && (!toggleBtn || !toggleBtn.contains(e.target))) {
        card.classList.remove('in-edit-mode');
        const inputs = card.querySelectorAll('input, textarea');
        inputs.forEach(input => {
          input.setAttribute('readonly', 'true');
        });
        if (toggleBtn) {
          toggleBtn.classList.remove('active');
        }
      }
    });
  });

  // 7. API Key Handshake Test
  document.getElementById('testApiKeyBtn')?.addEventListener('click', async () => {
    const key = document.getElementById('geminiApiKey').value.trim();
    const statusEl = document.getElementById('apiStatus');
    if (!key) {
      showToast('Gemini API key is required.', 'error');
      return;
    }
    statusEl.innerText = 'Testing...';
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Ping' }] }] })
      });
      if (res.ok) {
        statusEl.innerText = 'Connected! ✅';
        statusEl.style.color = '#10b981';
        showToast('Gemini AI Engine Connection Successful!');
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      statusEl.innerText = 'Failed ❌';
      statusEl.style.color = '#f43f5e';
      showToast('Gemini connection failed: ' + err.message, 'error');
    }
  });

  // 8. Security Passcode Update
  document.getElementById('savePasscodeBtn')?.addEventListener('click', () => {
    const curr = document.getElementById('currentPasscode').value.trim();
    const next = document.getElementById('newPasscode').value.trim();
    const savedCode = localStorage.getItem('securityPasscode') || 'admin123';

    if (curr !== savedCode) {
      showToast('Incorrect current security passcode.', 'error');
      return;
    }
    if (!next) {
      showToast('New passcode cannot be empty.', 'error');
      return;
    }

    localStorage.setItem('securityPasscode', next);
    showToast('Vault lock passcode updated successfully!');
    document.getElementById('currentPasscode').value = '';
    document.getElementById('newPasscode').value = '';
  });

  // 9. Destructive Data Actions & Confirmations
  document.getElementById('clearLocalDataBtn')?.addEventListener('click', () => {
    openConfirmationModal('Clear Local Data', 'Are you sure you want to clear your local form history, cached templates, and session logs?', () => {
      localStorage.removeItem('formHistory');
      showToast('Form history and session logs cleared successfully!');
    });
  });

  document.getElementById('resetAllDataBtn')?.addEventListener('click', () => {
    openConfirmationModal('Wipe Vault Data', 'CRITICAL WARNING: This will permanently delete your entire student profile vault, saved reviews, and credentials. This action cannot be undone.', () => {
      // Clear profile and reviews
      fieldIds.forEach(id => {
        localStorage.removeItem(id);
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      localStorage.removeItem('studentProfiles');
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('ccSession');
      showToast('All database records wiped out.', 'error');
      setTimeout(() => {
        window.location.href = 'agent/login-panel.html';
      }, 1200);
    });
  });

  document.getElementById('clearHistoryBtn')?.addEventListener('click', () => {
    openConfirmationModal('Clear History', 'Are you sure you want to clear all completed form audits?', () => {
      localStorage.removeItem('formHistory');
      showToast('Completed forms logs deleted.');
    });
  });

  document.getElementById('clearProfileBtn')?.addEventListener('click', () => {
    openConfirmationModal('Clear Profile', 'Wipe student profile values?', () => {
      profileFieldsList.forEach(id => {
        localStorage.removeItem(id);
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      calculateProfileCompletion();
      showToast('Profile values cleared.', 'warning');
    });
  });

  // Backup Engine Exports/Imports
  document.getElementById('exportDataBtn')?.addEventListener('click', () => {
    const data = {};
    fieldIds.forEach(id => {
      data[id] = localStorage.getItem(id);
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'campus-copilot-vault.json';
    a.click();
    showToast('Data exported successfully!');
  });
  document.getElementById('dataExportBtn')?.addEventListener('click', () => {
    document.getElementById('exportDataBtn').click();
  });

  document.getElementById('dataImportBtn')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          Object.keys(data).forEach(key => {
            if (data[key] !== null) localStorage.setItem(key, data[key]);
          });
          loadProfileData();
          showToast('JSON Profile backup imported successfully!');
        } catch (err) {
          showToast('Failed to parse import data: ' + err.message, 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });

  // 10. Switches & Toggles State Synchronization
  const switchIds = [
    'toggleAutosave', 'toggleConfirmAuto', 'toggleToasts', 'toggleAnimations',
    'toggleAutofillEnabled', 'toggleAssistantBadge', 'toggleAutoDetect', 'toggleConfirmSensitive',
    'toggleSemanticMatching', 'toggleShowConfidence',
    'toggleAlertFormSuccess', 'toggleAlertAutofillAvail', 'toggleAlertMissingInfo', 'toggleAlertLowConfidence',
    'toggleAlertConnection', 'toggleAlertDeadlines',
    'toggleAiFormMatching', 'toggleAiSemantic', 'toggleAiConfidence', 'toggleAiSuggestions'
  ];

  switchIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      // Load state
      el.checked = localStorage.getItem(id) !== 'false'; // default is true
      // Bind listener
      el.addEventListener('change', async () => {
        localStorage.setItem(id, el.checked);
        showToast('Preferences synchronized!');
        
        if (isSupabaseConfigured) {
          try {
            const { data: currentSettings } = await window.supabaseClient
              .from('user_settings')
              .select('switches')
              .eq('user_id', sessionUser.userId)
              .single();
              
            const updatedSwitches = {
              ...(currentSettings ? currentSettings.switches : {}),
              [id]: el.checked
            };

            await window.supabaseClient
              .from('user_settings')
              .upsert({
                user_id: sessionUser.userId,
                switches: updatedSwitches
              }, { onConflict: 'user_id' });
          } catch (err) {
            console.warn('Failed to sync setting toggle to Supabase:', err.message);
          }
        }
      });
    }
  });

  // Select configurations
  const prefLanguage = document.getElementById('prefLanguage');
  const prefLanding = document.getElementById('prefLanding');
  const selectAiMode = document.getElementById('selectAiMode');

  if (prefLanguage) {
    prefLanguage.value = localStorage.getItem('prefLanguage') || 'en';
    prefLanguage.addEventListener('change', async () => {
      localStorage.setItem('prefLanguage', prefLanguage.value);
      showToast('Preferred language updated.');
      if (isSupabaseConfigured) {
        await window.supabaseClient
          .from('user_settings')
          .upsert({ user_id: sessionUser.userId, pref_language: prefLanguage.value }, { onConflict: 'user_id' });
      }
    });
  }
  if (prefLanding) {
    prefLanding.value = localStorage.getItem('prefLanding') || 'dashboard';
    prefLanding.addEventListener('change', async () => {
      localStorage.setItem('prefLanding', prefLanding.value);
      showToast('Preferred landing page updated.');
      if (isSupabaseConfigured) {
        await window.supabaseClient
          .from('user_settings')
          .upsert({ user_id: sessionUser.userId, pref_landing: prefLanding.value }, { onConflict: 'user_id' });
      }
    });
  }
  if (selectAiMode) {
    selectAiMode.value = localStorage.getItem('selectAiMode') || 'balanced';
    selectAiMode.addEventListener('change', async () => {
      localStorage.setItem('selectAiMode', selectAiMode.value);
      showToast('AI processing mode adjusted.');
      if (isSupabaseConfigured) {
        await window.supabaseClient
          .from('user_settings')
          .upsert({ user_id: sessionUser.userId, select_ai_mode: selectAiMode.value }, { onConflict: 'user_id' });
      }
    });
  }

  document.getElementById('resetAutofillBtn')?.addEventListener('click', async () => {
    const autoSwitches = [
      'toggleAutofillEnabled', 'toggleAssistantBadge', 'toggleAutoDetect',
      'toggleConfirmSensitive', 'toggleSemanticMatching', 'toggleShowConfidence'
    ];
    const switchesUpdate = {};
    autoSwitches.forEach(id => {
      localStorage.setItem(id, 'true');
      const el = document.getElementById(id);
      if (el) el.checked = true;
      switchesUpdate[id] = true;
    });
    showToast('Autofill preferences reset to defaults.');

    if (isSupabaseConfigured) {
      try {
        const { data: currentSettings } = await window.supabaseClient
          .from('user_settings')
          .select('switches')
          .eq('user_id', sessionUser.userId)
          .single();

        const updatedSwitches = {
          ...(currentSettings ? currentSettings.switches : {}),
          ...switchesUpdate
        };

        await window.supabaseClient
          .from('user_settings')
          .upsert({
            user_id: sessionUser.userId,
            switches: updatedSwitches
          }, { onConflict: 'user_id' });
      } catch (err) {
        console.warn('Failed to sync settings reset to Supabase:', err.message);
      }
    }
  });

  // 11. Appearance Controls (Themes, Accents, Density)
  // Load Theme
  const savedTheme = localStorage.getItem('appTheme') || 'light';
  document.querySelectorAll('input[name="themeSelect"]').forEach(radio => {
    if (radio.value === savedTheme) radio.checked = true;
    radio.addEventListener('change', async () => {
      const val = radio.value;
      localStorage.setItem('appTheme', val);
      applyTheme(val);
      showToast('Appearance theme updated.');
      if (isSupabaseConfigured) {
        await window.supabaseClient
          .from('user_settings')
          .upsert({ user_id: sessionUser.userId, theme: val }, { onConflict: 'user_id' });
      }
    });
  });

  function applyTheme(theme) {
    document.body.classList.remove('dark-theme');
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.body.classList.add('dark-theme');
    }
  }
  applyTheme(savedTheme);

  // Load Accent Color
  const savedAccent = localStorage.getItem('appAccent') || 'default';
  document.querySelectorAll('.accent-color-btn').forEach(btn => {
    const acc = btn.dataset.accent;
    if (acc === savedAccent) btn.classList.add('active');
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.accent-color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      localStorage.setItem('appAccent', acc);
      applyAccent(acc);
      showToast('Accent colors updated.');
      if (isSupabaseConfigured) {
        await window.supabaseClient
          .from('user_settings')
          .upsert({ user_id: sessionUser.userId, accent_color: acc }, { onConflict: 'user_id' });
      }
    });
  });

  function applyAccent(accent) {
    document.body.classList.remove('accent-indigo', 'accent-teal', 'accent-purple');
    if (accent !== 'default') {
      document.body.classList.add(`accent-${accent}`);
    }
  }
  applyAccent(savedAccent);

  // Load Density
  const savedDensity = localStorage.getItem('appDensity') || 'comfortable';
  document.querySelectorAll('.density-btn').forEach(btn => {
    const den = btn.dataset.density;
    if (den === savedDensity) btn.classList.add('active');
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.density-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      localStorage.setItem('appDensity', den);
      applyDensity(den);
      showToast('Density adjusted.');
      if (isSupabaseConfigured) {
        await window.supabaseClient
          .from('user_settings')
          .upsert({ user_id: sessionUser.userId, density: den }, { onConflict: 'user_id' });
      }
    });
  });

  function applyDensity(density) {
    document.body.classList.remove('density-compact');
    if (density === 'compact') {
      document.body.classList.add('density-compact');
    }
  }
  applyDensity(savedDensity);

  // 12. Browser Extension Connect Button Mock
  document.getElementById('connectExtBtn')?.addEventListener('click', () => {
    showToast('Extension connection failed: connection is not available in development environment.', 'error');
  });
  document.getElementById('disconnectExtBtn')?.addEventListener('click', () => {
    showToast('Extension disabled.', 'warning');
  });
  document.getElementById('testConnBtn')?.addEventListener('click', () => {
    showToast('Extension link not found.', 'error');
  });

  // Account Page Binding
  const loadAccountDetails = () => {
    if (sessionUser) {
      const nameEl = document.getElementById('accUserNameText');
      const emailEl = document.getElementById('accUserEmailText');
      const avatarEl = document.getElementById('accUserAvatar');
      if (nameEl) nameEl.innerText = sessionUser.name;
      if (emailEl) emailEl.innerText = sessionUser.email;
      if (avatarEl && sessionUser.picture) avatarEl.src = sessionUser.picture;
    }
  };
  loadAccountDetails();

  document.getElementById('accEditProfileBtn')?.addEventListener('click', () => {
    const profileSubTab = document.querySelector('.settings-nav-item[data-subtab="settings-profile"]');
    if (profileSubTab) profileSubTab.click();
  });

  // 13. Recent Forms detail modals
  const mockFormsDatabase = {
    'mass-review': {
      title: 'Mass Review - Week 3',
      date: 'Aug 25, 2026',
      details: [
        { label: 'Hostel Room No', value: 'Block B, Room 412' },
        { label: 'Mess Food Rating', value: '4 / 5' },
        { label: 'Water Quality', value: 'Water supply is consistent, RO drinking water is clean.' },
        { label: 'Hostel Wi-Fi Speed', value: 'Wi-Fi connectivity is reliable in study lounge.' }
      ]
    },
    'techfest': {
      title: 'TechFest Registration',
      date: 'Aug 24, 2026',
      details: [
        { label: 'Student Name', value: 'Alex Johnson' },
        { label: 'Student ID / Registration', value: '26BCS10220' },
        { label: 'College Email ID', value: 'alex.j@university.edu' },
        { label: 'Section/Batch/Group', value: 'Batch A' }
      ]
    },
    'scholarship': {
      title: 'Scholarship Application',
      date: 'Aug 22, 2026',
      details: [
        { label: 'Legal Student Name', value: 'Alex Johnson' },
        { label: 'Father\'s Name', value: 'Michael Johnson' },
        { label: 'Emergency Contact No', value: '+1 987 654 3210' },
        { label: 'Cumulative CGPA', value: '9.2' }
      ]
    },
    'internship': {
      title: 'Internship Registration',
      date: 'Aug 18, 2026',
      details: [
        { label: 'Student Full Name', value: 'Alex Johnson' },
        { label: 'Graduation Year', value: '2027' },
        { label: 'Course Enrolled', value: 'Computer Science Engineering' }
      ]
    }
  };

  const formDetailModal = document.getElementById('formDetailModal');
  const formDetailTitle = document.getElementById('formDetailTitle');
  const formDetailDate = document.getElementById('formDetailDate');
  const formDetailContent = document.getElementById('formDetailContent');

  document.querySelectorAll('.form-row-item').forEach(row => {
    row.addEventListener('click', () => {
      const fKey = row.dataset.form;
      const fData = mockFormsDatabase[fKey];
      if (fData && formDetailModal) {
        formDetailTitle.innerText = fData.title;
        formDetailDate.innerText = `Completed on ${fData.date}`;
        
        let contentHtml = '';
        fData.details.forEach(item => {
          contentHtml += `
            <div style="border-bottom: 1px solid rgba(74,74,74,0.06); padding-bottom: 6px;">
              <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">${item.label}</span>
              <p style="font-size: 13.5px; color: var(--text-main); margin-top: 2px;">${item.value}</p>
            </div>
          `;
        });
        formDetailContent.innerHTML = contentHtml;
        formDetailModal.style.display = 'flex';
      }
    });
  });

  document.getElementById('formDetailCloseBtn')?.addEventListener('click', () => {
    if (formDetailModal) formDetailModal.style.display = 'none';
  });

  document.getElementById('tryDemoFormBtn')?.addEventListener('click', () => {
    window.location.href = 'test-form.html';
  });

  // 14. Voice Dictation Engine for All Textareas
  function setupDictation(btnId, targetInputId) {
    const btn = document.getElementById(btnId);
    const target = document.getElementById(targetInputId);
    if (!btn || !target) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      btn.style.display = 'none';
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    let isListening = false;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!isListening) {
        recognition.start();
      } else {
        recognition.stop();
      }
    });

    recognition.onstart = () => {
      isListening = true;
      btn.classList.add('mic-recording');
      btn.innerText = '🎙️ Listening...';
    };

    recognition.onresult = (event) => {
      const speech = event.results[0][0].transcript;
      target.value = (target.value ? target.value + ' ' : '') + speech;
    };

    recognition.onend = () => {
      isListening = false;
      btn.classList.remove('mic-recording');
      btn.innerText = '🎙️ Dictate';
    };
  }

  setupDictation('micWaterBtn', 'waterFeedback');
  setupDictation('micHostelWifiBtn', 'hostelWifiFeedback');
  setupDictation('micCleanBtn', 'cleanlinessFeedback');
  setupDictation('micFoodBtn', 'foodQualityFeedback');
  setupDictation('micFacultyBtn', 'facultyFeedback');
  setupDictation('micClubBtn', 'clubInterests');

  // Dynamic Settings Panel Drawer Compatibility (Left settingsBtn from main header)
  const openDrawerBtn = document.getElementById('openSettingsPanelBtn');
  const closeDrawerBtn = document.getElementById('closeSettingsPanelBtn');
  const drawerPanel = document.getElementById('settingsSidePanel');
  const drawerBackdrop = document.getElementById('settingsBackdrop');

  const openDrawer = () => {
    drawerBackdrop?.classList.add('active');
    drawerPanel?.classList.add('active');
  };

  const closeDrawer = () => {
    drawerBackdrop?.classList.remove('active');
    drawerPanel?.classList.remove('active');
  };

  openDrawerBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    // Redirect direct to the inline Settings Hub Tab!
    window.location.hash = '#settings';
  });
  closeDrawerBtn?.addEventListener('click', closeDrawer);
  drawerBackdrop?.addEventListener('click', closeDrawer);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDrawer();
      closeConfirmationModal();
      if (formDetailModal) formDetailModal.style.display = 'none';
    }
  });

  // Drawer sidebar navigation buttons fallback
  const drawerTabButtons = document.querySelectorAll('.drawer-tab-btn');
  const drawerTabPanels = document.querySelectorAll('.drawer-tab-panel');

  drawerTabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      drawerTabButtons.forEach(b => b.classList.remove('active'));
      drawerTabPanels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const targetTab = btn.dataset.settingsTab;
      const targetPanel = document.getElementById(`settings-tab-${targetTab}`);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });

  // ==========================================
  // INTERACTIVE AVATAR SYSTEM
  // ==========================================

  // Predefined Avatars Registry with keywords for search
  const PREDEFINED_AVATARS = [
    // Nature
    { id: 'nature-mountain', name: 'Mountain', category: 'nature', content: '🏔️', keywords: ['mountain', 'nature', 'peak', 'snow', 'cold'] },
    { id: 'nature-tree', name: 'Tree', category: 'nature', content: '🌲', keywords: ['tree', 'nature', 'pine', 'forest', 'green'] },
    { id: 'nature-leaf', name: 'Leaf', category: 'nature', content: '🍁', keywords: ['leaf', 'nature', 'autumn', 'orange'] },
    { id: 'nature-forest', name: 'Forest', category: 'nature', content: '🌳', keywords: ['forest', 'nature', 'tree', 'green'] },
    { id: 'nature-ocean', name: 'Ocean', category: 'nature', content: '🌊', keywords: ['ocean', 'nature', 'water', 'wave', 'sea', 'blue'] },
    { id: 'nature-sunset', name: 'Sunset', category: 'nature', content: '🌅', keywords: ['sunset', 'nature', 'sun', 'sky', 'evening'] },

    // Animals
    { id: 'animal-cat', name: 'Cat', category: 'animals', content: '🐱', keywords: ['cat', 'animal', 'pet', 'kitten', 'meow'] },
    { id: 'animal-dog', name: 'Dog', category: 'animals', content: '🐶', keywords: ['dog', 'animal', 'pet', 'puppy', 'bark'] },
    { id: 'animal-panda', name: 'Panda', category: 'animals', content: '🐼', keywords: ['panda', 'animal', 'bear', 'bamboo'] },
    { id: 'animal-fox', name: 'Fox', category: 'animals', content: '🦊', keywords: ['fox', 'animal', 'wild'] },
    { id: 'animal-bear', name: 'Bear', category: 'animals', content: '🐻', keywords: ['bear', 'animal', 'grizzly'] },
    { id: 'animal-penguin', name: 'Penguin', category: 'animals', content: '🐧', keywords: ['penguin', 'animal', 'bird', 'ice', 'cold'] },
    { id: 'animal-owl', name: 'Owl', category: 'animals', content: '🦉', keywords: ['owl', 'animal', 'bird', 'night', 'wisdom'] },

    // Food
    { id: 'food-pizza', name: 'Pizza', category: 'food', content: '🍕', keywords: ['pizza', 'food', 'cheese', 'italian'] },
    { id: 'food-burger', name: 'Burger', category: 'food', content: '🍔', keywords: ['burger', 'food', 'fastfood', 'meat'] },
    { id: 'food-coffee', name: 'Coffee', category: 'food', content: '☕', keywords: ['coffee', 'food', 'drink', 'cafe', 'morning'] },
    { id: 'food-donut', name: 'Donut', category: 'food', content: '🍩', keywords: ['donut', 'food', 'sweet', 'pink'] },
    { id: 'food-icecream', name: 'Ice Cream', category: 'food', content: '🍦', keywords: ['ice cream', 'food', 'sweet', 'cold', 'dessert'] },
    { id: 'food-fruit', name: 'Fruit', category: 'food', content: '🍎', keywords: ['fruit', 'food', 'apple', 'healthy', 'red'] },

    // Space
    { id: 'space-planet', name: 'Planet', category: 'space', content: '🪐', keywords: ['planet', 'space', 'saturn', 'ring'] },
    { id: 'space-galaxy', name: 'Galaxy', category: 'space', content: '🌌', keywords: ['galaxy', 'space', 'stars', 'night'] },
    { id: 'space-moon', name: 'Moon', category: 'space', content: '🌙', keywords: ['moon', 'space', 'night', 'crescent'] },
    { id: 'space-astronaut', name: 'Astronaut', category: 'space', content: '👨‍🚀', keywords: ['astronaut', 'space', 'suit', 'human'] },
    { id: 'space-rocket', name: 'Rocket', category: 'space', content: '🚀', keywords: ['rocket', 'space', 'launch', 'speed'] },

    // Tech
    { id: 'tech-laptop', name: 'Laptop', category: 'tech', content: '💻', keywords: ['laptop', 'tech', 'computer', 'screen', 'work'] },
    { id: 'tech-robot', name: 'Robot', category: 'tech', content: '🤖', keywords: ['robot', 'tech', 'ai', 'droid', 'machine'] },
    { id: 'tech-ai', name: 'AI Brain', category: 'tech', content: '🧠', keywords: ['ai', 'tech', 'brain', 'intelligence', 'mind'] },
    { id: 'tech-code', name: 'Code Dev', category: 'tech', content: '👨‍💻', keywords: ['code', 'tech', 'dev', 'developer', 'program'] },
    { id: 'tech-circuit', name: 'Circuit', category: 'tech', content: '🔌', keywords: ['circuit', 'tech', 'power', 'plug'] },
    { id: 'tech-sphere', name: 'Digital Sphere', category: 'tech', content: '🌐', keywords: ['sphere', 'tech', 'world', 'web', 'internet'] },

    // Abstract
    { id: 'abstract-mesh1', name: 'Cool Blue Gradient', category: 'abstract', type: 'gradient', gradient: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)', keywords: ['gradient', 'blue', 'mesh', 'abstract'] },
    { id: 'abstract-mesh2', name: 'Sunset Glow', category: 'abstract', type: 'gradient', gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)', keywords: ['gradient', 'pink', 'sunset', 'abstract'] },
    { id: 'abstract-mesh3', name: 'Neon Purple', category: 'abstract', type: 'gradient', gradient: 'linear-gradient(135deg, #7028e4 0%, #e20b8c 100%)', keywords: ['gradient', 'purple', 'neon', 'abstract'] },
    { id: 'abstract-mesh4', name: 'Emerald Dream', category: 'abstract', type: 'gradient', gradient: 'linear-gradient(135deg, #96fbc4 0%, #f9f586 100%)', keywords: ['gradient', 'green', 'emerald', 'abstract'] },
    { id: 'abstract-mesh5', name: 'Deep Ocean', category: 'abstract', type: 'gradient', gradient: 'linear-gradient(135deg, #2a9d8f 0%, #264653 100%)', keywords: ['gradient', 'teal', 'dark', 'abstract', 'ocean'] },
    { id: 'abstract-mesh6', name: 'Peach Velvet', category: 'abstract', type: 'gradient', gradient: 'linear-gradient(135deg, #f1a7a1 0%, #fab1a0 100%)', keywords: ['gradient', 'peach', 'rose', 'abstract'] },

    // Cartoon
    { id: 'cartoon-student', name: 'Student Boy', category: 'cartoon', content: '👦', keywords: ['student', 'cartoon', 'boy', 'kid'] },
    { id: 'cartoon-student2', name: 'Student Girl', category: 'cartoon', content: '👧', keywords: ['student', 'cartoon', 'girl', 'kid'] },
    { id: 'cartoon-mascot', name: 'Lion Mascot', category: 'cartoon', content: '🦁', keywords: ['mascot', 'cartoon', 'lion', 'animal'] },
    { id: 'cartoon-unicorn', name: 'Unicorn', category: 'cartoon', content: '🦄', keywords: ['unicorn', 'cartoon', 'magic', 'horse'] },
    { id: 'cartoon-dino', name: 'Dino', category: 'cartoon', content: '🦖', keywords: ['dino', 'cartoon', 'dinosaur', 'green'] },

    // Minimal
    { id: 'minimal-square', name: 'Gold Monogram', category: 'minimal', type: 'emoji', content: '⭐', keywords: ['minimal', 'star', 'gold'] },
    { id: 'minimal-heart', name: 'Heart Check', category: 'minimal', type: 'emoji', content: '💖', keywords: ['minimal', 'heart', 'pink'] },
    { id: 'minimal-sparkle', name: 'Sparkle Grid', category: 'minimal', type: 'emoji', content: '✨', keywords: ['minimal', 'sparkle', 'magic'] },
    { id: 'minimal-crown', name: 'Crown', category: 'minimal', type: 'emoji', content: '👑', keywords: ['minimal', 'crown', 'gold'] },

    // Professional
    { id: 'prof-briefcase', name: 'Briefcase', category: 'professional', content: '💼', keywords: ['briefcase', 'professional', 'work', 'bag'] },
    { id: 'prof-academy', name: 'Academy', category: 'professional', content: '🏛️', keywords: ['academy', 'professional', 'college', 'building'] },
    { id: 'prof-pencil', name: 'Pencil', category: 'professional', content: '✏️', keywords: ['pencil', 'professional', 'write', 'draw'] },
    { id: 'prof-books', name: 'Books Stack', category: 'professional', content: '📚', keywords: ['books', 'professional', 'study', 'read', 'library'] }
  ];

  // Helper: Get Name Initials Fallback Image (Renders dynamic canvas fallback)
  function getInitials(name) {
    if (!name) name = localStorage.getItem('fullName') || (sessionUser && sessionUser.name) || 'Campus Copilot';
    
    // Parse initials
    const words = name.trim().split(/\s+/);
    let initials = 'CC';
    if (words.length > 0 && words[0]) {
      const first = words[0].charAt(0).toUpperCase();
      const last = words.length > 1 ? words[words.length - 1].charAt(0).toUpperCase() : '';
      initials = first + last;
    }

    // Render initials on Canvas
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Fill background
    ctx.fillStyle = '#FAB1A0'; // brand dusty rose pink
    ctx.fillRect(0, 0, 512, 512);

    // Write text
    ctx.fillStyle = '#4A4A4A'; // brand text-main
    ctx.font = 'bold 180px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, 256, 256);

    return canvas.toDataURL();
  }

  // Load and apply the profile avatar state synchronized across page widgets
  function loadProfileAvatar() {
    const dashAvatar = document.getElementById('dashUserAvatar');
    const accAvatar = document.getElementById('accUserAvatar');
    if (!dashAvatar && !accAvatar) return;

    // Priority checks:
    // 1. User-selected custom image / base64 string
    // 2. User-selected predefined avatar ID (lookup metadata)
    // 3. Google Account photo fallback
    // 4. Initials fallback
    const customAvatar = localStorage.getItem('ccUserAvatarCustom');
    const predefinedId = localStorage.getItem('ccUserAvatarPredefined');
    const googlePic = (sessionUser && sessionUser.picture) || null;

    let targetSrc = '';

    if (customAvatar) {
      targetSrc = customAvatar;
    } else if (predefinedId) {
      const match = PREDEFINED_AVATARS.find(a => a.id === predefinedId);
      if (match) {
        if (match.type === 'gradient') {
          // Render gradient on canvas
          const canvas = document.createElement('canvas');
          canvas.width = 512;
          canvas.height = 512;
          const ctx = canvas.getContext('2d');
          const grad = ctx.createLinearGradient(0, 0, 512, 512);
          const matches = match.gradient.match(/#[a-fA-F0-9]{3,8}/g);
          if (matches && matches.length >= 2) {
            grad.addColorStop(0, matches[0]);
            grad.addColorStop(1, matches[1]);
          } else {
            grad.addColorStop(0, '#2A9D8F');
            grad.addColorStop(1, '#264653');
          }
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 512, 512);
          targetSrc = canvas.toDataURL();
        } else {
          // Render emoji on canvas
          const canvas = document.createElement('canvas');
          canvas.width = 512;
          canvas.height = 512;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = 'rgba(42, 157, 143, 0.08)'; // cool teal tint
          ctx.fillRect(0, 0, 512, 512);
          ctx.fillStyle = '#000000'; // Reset color to solid black to prevent background opacity inheritance on emoji glyph
          ctx.font = '280px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(match.content, 256, 256);
          targetSrc = canvas.toDataURL();
        }
      } else {
        targetSrc = getInitials();
      }
    } else if (googlePic && googlePic !== 'https://lh3.googleusercontent.com/a/default-user') {
      targetSrc = googlePic;
    } else {
      targetSrc = getInitials();
    }

    if (dashAvatar) dashAvatar.src = targetSrc;
    if (accAvatar) accAvatar.src = targetSrc;
  }
  loadProfileAvatar();

  // Watch profile name updates to reload initials fallback automatically
  document.getElementById('fullName')?.addEventListener('input', () => {
    if (!localStorage.getItem('ccUserAvatarCustom') && !localStorage.getItem('ccUserAvatarPredefined')) {
      loadProfileAvatar();
    }
  });

  // Modal editor elements
  const avatarEditorModal = document.getElementById('avatarEditorModal');
  const tabChooseAvatarBtn = document.getElementById('tabChooseAvatarBtn');
  const tabUploadPhotoBtn = document.getElementById('tabUploadPhotoBtn');
  const avatarLibraryView = document.getElementById('avatarLibraryView');
  const avatarUploadView = document.getElementById('avatarUploadView');
  
  const searchInput = document.getElementById('avatarSearchInput');
  const categoriesBar = document.getElementById('avatarCategoriesBar');
  const gridContainer = document.getElementById('avatarGridContainer');

  const uploadZone = document.getElementById('avatarUploadZone');
  const fileInput = document.getElementById('avatarFileInput');
  const cropContainer = document.getElementById('avatarCropContainer');
  const cropImage = document.getElementById('avatarCropImage');
  const cropZoomSlider = document.getElementById('cropZoomSlider');

  const removeBtn = document.getElementById('avatarRemoveBtn');
  const cancelBtn = document.getElementById('avatarCancelBtn');
  const saveBtn = document.getElementById('avatarSaveBtn');

  let activeTab = 'choose'; // choose | upload
  let selectedPredefinedId = null;
  let customUploadedBase64 = null;

  // Zoom/Cropper Drag Offset Variables
  let isDraggingCrop = false;
  let startDragX = 0;
  let startDragY = 0;
  let cropOffsetX = 0;
  let cropOffsetY = 0;
  let cropScale = 1;
  let baseWidth = 200;
  let baseHeight = 200;
  let baseOffsetX = 0;
  let baseOffsetY = 0;

  // Open Avatar Modal Editor
  document.querySelectorAll('.edit-avatar-trigger').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Load initial selected states
      selectedPredefinedId = localStorage.getItem('ccUserAvatarPredefined');
      customUploadedBase64 = localStorage.getItem('ccUserAvatarCustom');
      
      // Reset variables
      cropOffsetX = 0;
      cropOffsetY = 0;
      cropScale = 1;
      cropZoomSlider.value = 1;

      // Reset tabs view
      switchTab('choose');
      searchInput.value = '';
      filterAndRenderAvatars('all', '');

      // Adjust remove button visibility
      if (customUploadedBase64 || selectedPredefinedId) {
        removeBtn.style.display = 'block';
      } else {
        removeBtn.style.display = 'none';
      }

      // Display Modal
      avatarEditorModal.style.display = 'flex';
    });
  });

  function switchTab(tab) {
    activeTab = tab;
    if (tab === 'choose') {
      tabChooseAvatarBtn.classList.add('active');
      tabUploadPhotoBtn.classList.remove('active');
      avatarLibraryView.style.display = 'flex';
      avatarUploadView.style.display = 'none';
    } else {
      tabChooseAvatarBtn.classList.remove('active');
      tabUploadPhotoBtn.classList.add('active');
      avatarLibraryView.style.display = 'none';
      avatarUploadView.style.display = 'flex';

      // Load preview crop layout if custom image already present
      if (customUploadedBase64) {
        cropImage.src = customUploadedBase64;
        cropContainer.style.display = 'flex';
        uploadZone.style.display = 'none';
      } else {
        cropContainer.style.display = 'none';
        uploadZone.style.display = 'block';
      }
    }
  }

  tabChooseAvatarBtn?.addEventListener('click', () => switchTab('choose'));
  tabUploadPhotoBtn?.addEventListener('click', () => switchTab('upload'));

  // Render Predefined Avatars Grid with Search & Filters
  function filterAndRenderAvatars(category = 'all', query = '') {
    gridContainer.innerHTML = '';
    const q = query.toLowerCase().trim();

    const filtered = PREDEFINED_AVATARS.filter(item => {
      const matchCat = category === 'all' || item.category === category;
      const matchSearch = !q || item.name.toLowerCase().includes(q) || 
                          (item.keywords && item.keywords.some(k => k.includes(q)));
      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      gridContainer.innerHTML = `<p style="grid-column: span 5; text-align: center; font-size: 13px; color: var(--text-muted); padding: 20px;">No avatars match your query.</p>`;
      return;
    }

    filtered.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'avatar-grid-item';
      if (item.id === selectedPredefinedId) itemEl.classList.add('selected');
      
      if (item.type === 'gradient') {
        itemEl.style.background = item.gradient;
      } else {
        itemEl.style.background = 'rgba(74,74,74,0.04)';
        itemEl.innerText = item.content;
      }

      itemEl.title = item.name;

      const checkEl = document.createElement('div');
      checkEl.className = 'avatar-grid-item-checkmark';
      checkEl.innerText = '✓';
      itemEl.appendChild(checkEl);

      // Click select event
      itemEl.addEventListener('click', () => {
        document.querySelectorAll('.avatar-grid-item').forEach(el => el.classList.remove('selected'));
        itemEl.classList.add('selected');
        selectedPredefinedId = item.id;
        customUploadedBase64 = null; // Clear upload selection
      });

      gridContainer.appendChild(itemEl);
    });
  }

  // Category tags click events
  categoriesBar?.addEventListener('click', (e) => {
    const tag = e.target.closest('.avatar-cat-tag');
    if (!tag) return;

    document.querySelectorAll('.avatar-cat-tag').forEach(t => t.classList.remove('active'));
    tag.classList.add('active');

    const cat = tag.dataset.category;
    filterAndRenderAvatars(cat, searchInput.value);
  });

  // Search input typing filter
  searchInput?.addEventListener('input', () => {
    const activeTag = document.querySelector('.avatar-cat-tag.active');
    const cat = activeTag ? activeTag.dataset.category : 'all';
    filterAndRenderAvatars(cat, searchInput.value);
  });

  // Upload Photo handlers
  uploadZone?.addEventListener('click', () => fileInput.click());

  // Drag and Drop Zone styling
  uploadZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });
  uploadZone?.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
  });
  uploadZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });

  fileInput?.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  });

  function handleFileSelected(file) {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('Unsupported format. Please select JPG, PNG, or WEBP.', 'error');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5 MB
    if (file.size > maxSize) {
      showToast('File is too large. Maximum size is 5MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      customUploadedBase64 = event.target.result;
      
      const img = new Image();
      img.onload = () => {
        // Calculate base cover dimensions for 200x200 viewport to fit aspect ratio
        const s = Math.max(200 / img.width, 200 / img.height);
        baseWidth = img.width * s;
        baseHeight = img.height * s;
        baseOffsetX = (200 - baseWidth) / 2;
        baseOffsetY = (200 - baseHeight) / 2;

        cropImage.src = customUploadedBase64;
        cropImage.style.width = baseWidth + 'px';
        cropImage.style.height = baseHeight + 'px';

        // Reset cropping positioning offsets
        cropOffsetX = 0;
        cropOffsetY = 0;
        cropScale = 1;
        cropZoomSlider.value = 1;
        updateCropPreviewStyle();

        uploadZone.style.display = 'none';
        cropContainer.style.display = 'flex';
        selectedPredefinedId = null; // Clear predefined selection
      };
      img.src = customUploadedBase64;
    };
    reader.readAsDataURL(file);
  }

  // Interactive Zoom and positioning drag cropper logic
  cropZoomSlider?.addEventListener('input', (e) => {
    cropScale = parseFloat(e.target.value);
    updateCropPreviewStyle();
  });

  const cropViewport = document.getElementById('avatarCropViewport');
  
  cropViewport?.addEventListener('mousedown', (e) => {
    isDraggingCrop = true;
    startDragX = e.clientX - cropOffsetX;
    startDragY = e.clientY - cropOffsetY;
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDraggingCrop) return;
    cropOffsetX = e.clientX - startDragX;
    cropOffsetY = e.clientY - startDragY;
    
    // Bounds limit checks (ensure image overlaps circular viewport mask)
    const bounds = 150;
    if (Math.abs(cropOffsetX) > bounds) cropOffsetX = Math.sign(cropOffsetX) * bounds;
    if (Math.abs(cropOffsetY) > bounds) cropOffsetY = Math.sign(cropOffsetY) * bounds;

    updateCropPreviewStyle();
  });

  window.addEventListener('mouseup', () => {
    isDraggingCrop = false;
  });

  // Touch support for mobiles/tablets cropper positioning
  cropViewport?.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isDraggingCrop = true;
      startDragX = e.touches[0].clientX - cropOffsetX;
      startDragY = e.touches[0].clientY - cropOffsetY;
      e.preventDefault();
    }
  });

  cropViewport?.addEventListener('touchmove', (e) => {
    if (isDraggingCrop && e.touches.length === 1) {
      cropOffsetX = e.touches[0].clientX - startDragX;
      cropOffsetY = e.touches[0].clientY - startDragY;
      updateCropPreviewStyle();
    }
  });

  cropViewport?.addEventListener('touchend', () => {
    isDraggingCrop = false;
  });

  function updateCropPreviewStyle() {
    cropImage.style.transform = `translate(${baseOffsetX + cropOffsetX}px, ${baseOffsetY + cropOffsetY}px) scale(${cropScale})`;
  }

  // Action Cancel flow
  function closeAvatarModal() {
    avatarEditorModal.style.display = 'none';
  }
  cancelBtn?.addEventListener('click', closeAvatarModal);

  // Save selected avatar changes
  saveBtn?.addEventListener('click', () => {
    if (activeTab === 'choose') {
      if (!selectedPredefinedId) {
        showToast('Please select an avatar library option.', 'error');
        return;
      }
      localStorage.removeItem('ccUserAvatarCustom');
      localStorage.setItem('ccUserAvatarPredefined', selectedPredefinedId);
      loadProfileAvatar();
      closeAvatarModal();
      showToast('Profile picture updated successfully!');
    } else {
      if (!customUploadedBase64) {
        showToast('Please upload a profile photo first.', 'error');
        return;
      }

      // Crop the image using temporary canvas
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');

      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, 512, 512);

        // Circular clipping path
        ctx.beginPath();
        ctx.arc(256, 256, 256, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();

        // Calculate exact scaling and translation matching the CSS display
        const ratio = 512 / 200;
        const dx = (baseOffsetX * ratio) + (cropOffsetX * ratio);
        const dy = (baseOffsetY * ratio) + (cropOffsetY * ratio);
        const dW = baseWidth * ratio * cropScale;
        const dH = baseHeight * ratio * cropScale;

        ctx.drawImage(img, dx, dy, dW, dH);
        
        const finalUrl = canvas.toDataURL('image/png');
        localStorage.removeItem('ccUserAvatarPredefined');
        localStorage.setItem('ccUserAvatarCustom', finalUrl);
        
        loadProfileAvatar();
        closeAvatarModal();
        showToast('Profile picture updated successfully!');
      };
      img.src = customUploadedBase64;
    }
  });

  // Remove photo flow with confirmation modal popup dialog
  removeBtn?.addEventListener('click', () => {
    openConfirmationModal('Remove Profile Picture', 'Are you sure you want to delete your customized avatar and restore defaults?', () => {
      localStorage.removeItem('ccUserAvatarCustom');
      localStorage.removeItem('ccUserAvatarPredefined');
      loadProfileAvatar();
      closeAvatarModal();
      showToast('Custom photo removed successfully.', 'warning');
    });
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAvatarModal();
    }
  });

  // ==================================================
  // CUSTOM FORM BUILDER STATE MANAGEMENT & RENDERING
  // ==================================================
  let customFormState = {
    formName: '',
    sections: []
  };

  const renderFormBuilderWorkspace = () => {
    const workspace = document.getElementById('customFormSectionsWorkspace');
    if (!workspace) return;
    
    workspace.innerHTML = '';
    
    if (customFormState.sections.length === 0) {
      workspace.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 30px; font-size: 13.5px;">
          No sections created yet. Click "Add Section Header" to start designing your custom form structure.
        </div>
      `;
      return;
    }
    
    customFormState.sections.forEach((section, secIdx) => {
      const secEl = document.createElement('div');
      secEl.className = 'custom-builder-section';
      secEl.style.border = '1px solid var(--card-border)';
      secEl.style.borderRadius = '12px';
      secEl.style.padding = '16px';
      secEl.style.background = 'rgba(74, 74, 74, 0.02)';
      secEl.style.display = 'flex';
      secEl.style.flexDirection = 'column';
      secEl.style.gap = '10px';
      secEl.style.position = 'relative';
      
      // Section Header row
      const headerRow = document.createElement('div');
      headerRow.style.display = 'flex';
      headerRow.style.gap = '12px';
      headerRow.style.alignItems = 'center';
      
      const titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.className = 'section-header-input';
      titleInput.placeholder = 'Section Header (e.g., Personal Details)';
      titleInput.value = section.title;
      titleInput.style.flex = '1';
      titleInput.style.fontWeight = '700';
      titleInput.style.fontSize = '14.5px';
      titleInput.style.border = 'none';
      titleInput.style.borderBottom = '1.5px solid transparent';
      titleInput.style.background = 'transparent';
      titleInput.style.padding = '4px 0';
      titleInput.style.outline = 'none';
      titleInput.style.color = 'var(--text-main)';
      titleInput.addEventListener('input', (e) => {
        section.title = e.target.value;
      });
      
      const removeSecBtn = document.createElement('button');
      removeSecBtn.type = 'button';
      removeSecBtn.innerHTML = '🗑️';
      removeSecBtn.style.background = 'none';
      removeSecBtn.style.border = 'none';
      removeSecBtn.style.fontSize = '16px';
      removeSecBtn.style.color = '#ff7675';
      removeSecBtn.style.cursor = 'pointer';
      removeSecBtn.style.padding = '4px';
      removeSecBtn.title = 'Remove Section';
      removeSecBtn.addEventListener('click', () => {
        customFormState.sections.splice(secIdx, 1);
        renderFormBuilderWorkspace();
      });
      
      headerRow.appendChild(titleInput);
      headerRow.appendChild(removeSecBtn);
      secEl.appendChild(headerRow);
      
      // Fields/Sub-headers Container
      const fieldsContainer = document.createElement('div');
      fieldsContainer.style.display = 'flex';
      fieldsContainer.style.flexDirection = 'column';
      fieldsContainer.style.gap = '8px';
      fieldsContainer.style.marginLeft = '12px';
      fieldsContainer.style.borderLeft = '2px solid rgba(74,74,74,0.06)';
      fieldsContainer.style.paddingLeft = '12px';
      
      section.fields.forEach((field, fieldIdx) => {
        const fieldEl = document.createElement('div');
        fieldEl.style.display = 'flex';
        fieldEl.style.gap = '10px';
        fieldEl.style.alignItems = 'center';
        
        const labelInput = document.createElement('input');
        labelInput.type = 'text';
        labelInput.className = 'field-label-input';
        labelInput.placeholder = 'Field Label (e.g., Date of Birth)';
        labelInput.value = field.label;
        labelInput.style.flex = '1';
        labelInput.style.fontSize = '13.5px';
        labelInput.style.border = 'none';
        labelInput.style.borderBottom = '1px solid rgba(74,74,74,0.1)';
        labelInput.style.background = 'transparent';
        labelInput.style.padding = '4px 0';
        labelInput.style.outline = 'none';
        labelInput.style.color = 'var(--text-main)';
        labelInput.addEventListener('input', (e) => {
          field.label = e.target.value;
        });
        
        const typeSelect = document.createElement('select');
        typeSelect.className = 'field-type-select';
        typeSelect.style.padding = '4px 8px';
        typeSelect.style.borderRadius = '6px';
        typeSelect.style.border = '1px solid var(--card-border)';
        typeSelect.style.fontSize = '12px';
        typeSelect.style.background = 'transparent';
        typeSelect.style.color = 'var(--text-main)';
        typeSelect.style.outline = 'none';
        
        const types = [
          { value: 'text', text: 'Text Input' },
          { value: 'number', text: 'Number' },
          { value: 'date', text: 'Date' },
          { value: 'rating', text: 'Rating (1-5)' }
        ];
        types.forEach(t => {
          const opt = document.createElement('option');
          opt.value = t.value;
          opt.innerText = t.text;
          opt.selected = field.type === t.value;
          typeSelect.appendChild(opt);
        });
        typeSelect.addEventListener('change', (e) => {
          field.type = e.target.value;
        });
        
        const removeFieldBtn = document.createElement('button');
        removeFieldBtn.type = 'button';
        removeFieldBtn.innerHTML = '🗑️';
        removeFieldBtn.style.background = 'none';
        removeFieldBtn.style.border = 'none';
        removeFieldBtn.style.fontSize = '14px';
        removeFieldBtn.style.color = '#ff7675';
        removeFieldBtn.style.cursor = 'pointer';
        removeFieldBtn.style.padding = '4px';
        removeFieldBtn.title = 'Remove Field';
        removeFieldBtn.addEventListener('click', () => {
          section.fields.splice(fieldIdx, 1);
          renderFormBuilderWorkspace();
        });
        
        fieldEl.appendChild(labelInput);
        fieldEl.appendChild(typeSelect);
        fieldEl.appendChild(removeFieldBtn);
        fieldsContainer.appendChild(fieldEl);
      });
      
      secEl.appendChild(fieldsContainer);
      
      // Add Sub-header button
      const addFieldBtn = document.createElement('button');
      addFieldBtn.type = 'button';
      addFieldBtn.className = 'btn btn-secondary';
      addFieldBtn.innerHTML = '➕ Add Field Sub-header';
      addFieldBtn.style.padding = '6px 12px';
      addFieldBtn.style.fontSize = '11.5px';
      addFieldBtn.style.fontWeight = '600';
      addFieldBtn.style.display = 'inline-flex';
      addFieldBtn.style.alignItems = 'center';
      addFieldBtn.style.gap = '4px';
      addFieldBtn.style.borderStyle = 'dashed';
      addFieldBtn.style.width = 'auto';
      addFieldBtn.style.marginLeft = '12px';
      addFieldBtn.addEventListener('click', () => {
        section.fields.push({
          id: 'field-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
          label: '',
          type: 'text'
        });
        renderFormBuilderWorkspace();
      });
      
      secEl.appendChild(addFieldBtn);
      workspace.appendChild(secEl);
    });
  };

  const customFormBuilderModal = document.getElementById('customFormBuilderModal');
  
  document.getElementById('newFormSyncBtn')?.addEventListener('click', () => {
    // Reset state
    customFormState = {
      formName: '',
      sections: [
        {
          id: 'sec-1',
          title: 'General Details',
          fields: [
            { id: 'f-1', label: 'Student Name', type: 'text' },
            { id: 'f-2', label: 'Email Address', type: 'text' }
          ]
        }
      ]
    };
    
    const nameInput = document.getElementById('customFormName');
    if (nameInput) nameInput.value = '';
    
    renderFormBuilderWorkspace();
    if (customFormBuilderModal) customFormBuilderModal.style.display = 'flex';
  });

  const closeCustomFormModal = () => {
    if (customFormBuilderModal) customFormBuilderModal.style.display = 'none';
  };
  
  document.getElementById('customFormCloseBtn')?.addEventListener('click', closeCustomFormModal);
  document.getElementById('customFormCancelBtn')?.addEventListener('click', closeCustomFormModal);

  document.getElementById('addCategoryBtn')?.addEventListener('click', () => {
    customFormState.sections.push({
      id: 'sec-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      title: '',
      fields: []
    });
    renderFormBuilderWorkspace();
  });

  document.getElementById('customFormSaveBtn')?.addEventListener('click', async () => {
    const formNameVal = document.getElementById('customFormName')?.value.trim();
    if (!formNameVal) {
      showToast('Please enter a form name.', 'error');
      return;
    }
    
    customFormState.formName = formNameVal;
    
    // Validate that sections exist and have fields
    if (customFormState.sections.length === 0) {
      showToast('Form must contain at least one section.', 'error');
      return;
    }
    
    // Local storage persistence
    const key = 'cc_custom_forms';
    const localSync = () => {
      const current = JSON.parse(localStorage.getItem(key) || '[]');
      current.push(customFormState);
      localStorage.setItem(key, JSON.stringify(current));
      
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ customFormSyncs: current });
      }
    };
    
    localSync();
    
    // Supabase Cloud Push
    if (isSupabaseConfigured) {
      updateSyncStatus('syncing');
      try {
        const { error } = await window.supabaseClient
          .from('custom_forms')
          .insert({
            user_id: sessionUser.userId,
            form_name: customFormState.formName,
            form_structure: customFormState
          });
          
        if (error) throw error;
        updateSyncStatus('active');
        showToast('Form synchronized with Supabase cloud!');
      } catch (err) {
        console.error('Supabase custom form save failed:', err.message);
        updateSyncStatus('failed');
        showToast('Sync failed: Stored locally.', 'warning');
      }
    } else {
      showToast('Form structure saved locally.');
    }
    
    closeCustomFormModal();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeCustomFormModal();
    }
  });

  // Run the security and authorization check once the environment is initialized
  checkAuth();
});
