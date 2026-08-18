const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const RSSParser = require('rss-parser');

const router = express.Router();
const parser = new RSSParser();

const WORKSPACE_DIR = '/home/elissa/Documents/DOCUMENT/PROFESSIONAL';

// ==========================================
// 1. Custom URL Scraper & AI matching
// ==========================================
router.get('/discovery/custom-scrape', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ error: 'URL query parameter is required' });
  }

  try {
    console.log(`Scraping custom URL: ${targetUrl}`);
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 10000
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Clean up unnecessary tags
    $('script, style, iframe, noscript, footer, nav, header').remove();

    const pageTitle = $('title').text().trim() || $('h1').first().text().trim() || 'Job Opportunity';
    
    // Extract main text content
    const pageText = $('body').text().replace(/\s+/g, ' ').trim();

    // Load CV content for matching
    let cvContent = "Profile: Full-Stack Software Developer | BSc Software Engineering (ALU) | Skills: React, Next.js, Node.js, Python, AI/ML, PostgreSQL, Docker, Figma";
    try {
      const cvPath = path.join(WORKSPACE_DIR, '50_Opportunities_Elissa.md');
      if (fs.existsSync(cvPath)) {
        cvContent = fs.readFileSync(cvPath, 'utf8').split('\n').slice(0, 10).join('\n');
      }
    } catch (err) {
      console.warn("Could not load CV profile:", err.message);
    }

    const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';

    if (geminiKey) {
      console.log('Gemini API key detected, running AI-powered job matching...');
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`;
      
      const prompt = `You are an expert AI career assistant. Analyze the following job description page text and match it against the user's CV profile:

USER CV PROFILE:
${cvContent}

JOB PAGE CONTENT:
${pageText.substring(0, 10000)}

Analyze the job posting, extract the details, compare the requirements against the user's skills/profile, and respond ONLY with a JSON object inside a single code block in this exact schema:
{
  "title": "Job Title",
  "company": "Company Name",
  "location": "Location",
  "compensation": "Compensation or salary range (or 'Not specified')",
  "deadline": "Application deadline date (or 'Not specified')",
  "description": "HTML-formatted clean summary of the job roles, main duties, and requirements.",
  "matchScore": 85,
  "matchReasoning": "Detailed, specific explanation of why this job fits the user's CV, highlighting matching skills and potential strengths.",
  "missingSkills": ["Skill A", "Requirement B"]
}`;

      try {
        const geminiRes = await axios.post(geminiUrl, {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        });

        const textResponse = geminiRes.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textResponse) {
          const parsed = JSON.parse(textResponse.trim());
          return res.json({
            ...parsed,
            link: targetUrl,
            source: 'AI Custom Scraper',
            aiPowered: true
          });
        }
      } catch (geminiError) {
        console.error('Gemini API call failed, falling back to local heuristic matching:', geminiError.message);
      }
    }

    // Heuristic Fallback Matching (Local Regex & Keyword Matcher)
    console.log('Running local heuristic matching...');
    const skillsToMatch = [
      { name: 'React', pattern: /react/i },
      { name: 'Next.js', pattern: /next\.?js/i },
      { name: 'Node.js', pattern: /node\.?js/i },
      { name: 'Python', pattern: /python/i },
      { name: 'AI/ML', pattern: /(ai|ml|machine learning|artificial intelligence)/i },
      { name: 'PostgreSQL', pattern: /(postgres|postgresql|sql)/i },
      { name: 'Docker', pattern: /docker/i },
      { name: 'Figma', pattern: /figma/i },
      { name: 'Software Engineer', pattern: /software\s*(engineer|developer)/i },
      { name: 'Full-Stack', pattern: /full\s*-?\s*stack/i }
    ];

    const matchedSkills = [];
    skillsToMatch.forEach(skill => {
      if (skill.pattern.test(pageText)) {
        matchedSkills.push(skill.name);
      }
    });

    const matchScore = Math.min(20 + matchedSkills.length * 15, 100);
    const missingSkills = skillsToMatch
      .filter(skill => !matchedSkills.includes(skill.name))
      .map(skill => skill.name);

    // Heuristically extract Company Name
    let companyName = 'Not specified';
    const companyMatch = pageTitle.match(/at\s+([A-Za-z0-9\s&]+?)(?:\s+-\s+|\s+\(|\s*\|)/i) || 
                         pageTitle.match(/hiring\s+([A-Za-z0-9\s&]+?)(?:\s+in\s+|\s+-\s+|\s*\|)/i);
    if (companyMatch && companyMatch[1]) {
      companyName = companyMatch[1].trim();
    } else {
      const parts = pageTitle.split(/[-|]/);
      if (parts.length > 1) {
        companyName = parts[parts.length - 1].trim();
      }
    }

    // Heuristically extract Location
    let jobLocation = 'Not specified';
    const locMatch = pageText.match(/(?:Location|Based in|Workplace):\s*([A-Za-z0-9\s,]+?)(?:\.|\n|Job Type)/i);
    if (locMatch && locMatch[1]) {
      jobLocation = locMatch[1].trim();
    }

    const descHtml = `
      <p class="mb-2"><strong>Scraped Title:</strong> ${pageTitle}</p>
      <p class="mb-4 text-xs text-muted-foreground leading-relaxed">${pageText.substring(0, 500)}...</p>
      <div class="mt-4 p-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-3xs rounded-lg uppercase tracking-wider font-bold">
        ⚠️ Local Matching Enabled: Add a VITE_GEMINI_API_KEY to your .env file to enable advanced AI-powered extraction and analysis.
      </div>
    `;

    res.json({
      title: pageTitle.split(/[-|]/)[0].trim(),
      company: companyName,
      location: jobLocation,
      compensation: 'Not specified',
      deadline: 'Not specified',
      description: descHtml,
      matchScore,
      matchReasoning: `Local skills scanner matched ${matchedSkills.length} of your key CV skills (${matchedSkills.join(', ')}).`,
      missingSkills,
      link: targetUrl,
      source: 'Custom Scraper',
      aiPowered: false
    });

  } catch (error) {
    console.error('Custom Scraper error:', error.message);
    res.status(500).json({ error: 'Failed to scrape job details from URL', details: error.message });
  }
});

// ==========================================
// 1. Discovery Routes (RSS Feeds)
// ==========================================
router.get('/discovery/rss', async (req, res) => {
  const feeds = [
    { name: 'Opportunities For Everyone', url: 'https://opportunitiesforeveryone.net/feed/' },
    { name: 'Bright Scholarship', url: 'https://brightscholarship.com/feed/' }
  ];

  const results = [];

  for (const feed of feeds) {
    try {
      console.log(`Fetching feed: ${feed.name} (${feed.url})`);
      const parsedFeed = await parser.parseURL(feed.url);
      
      const items = parsedFeed.items.map(item => {
        let deadline = '';
        const desc = item.contentSnippet || item.content || '';
        
        const dateMatch = desc.match(/(?:Deadline|Closing Date|Due Date):\s*([0-9a-zA-Z\s,]+)/i);
        if (dateMatch && dateMatch[1]) {
          deadline = dateMatch[1].trim().replace(/\s+/g, ' ');
        }

        return {
          title: item.title,
          link: item.link,
          pubDate: item.pubDate,
          categories: item.categories || [],
          description: desc.substring(0, 300) + '...',
          source: feed.name,
          deadline: deadline || 'See details'
        };
      });

      results.push({
        source: feed.name,
        items
      });
    } catch (error) {
      console.error(`Error parsing feed ${feed.name}:`, error.message);
      results.push({
        source: feed.name,
        error: true,
        message: error.message,
        items: []
      });
    }
  }

  res.json(results);
});

// ==========================================
// 2. Discovery Routes (LinkedIn Scraper)
// ==========================================
router.get('/discovery/linkedin', async (req, res) => {
  const keywords = req.query.keywords || 'Software Engineer';
  const location = req.query.location || 'Rwanda';
  const start = req.query.start || 0;

  try {
    const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}&start=${start}`;
    console.log(`Scraping LinkedIn jobs via guest endpoint: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);
    const jobs = [];

    $('.job-search-card').each((index, element) => {
      const card = $(element);
      
      const title = card.find('.base-search-card__title').text().trim();
      const company = card.find('.base-search-card__subtitle, .job-search-card__subtitle').text().trim();
      const jobLocation = card.find('.job-search-card__location').text().trim();
      const link = card.find('.base-card__full-link').attr('href') || '';
      
      const logoEl = card.find('.search-entity-media img');
      const logo = logoEl.attr('data-delayed-url') || logoEl.attr('src') || '';
      
      const postDate = card.find('.job-search-card__listdate, .job-search-card__listdate--new').attr('datetime') || 
                       card.find('.job-search-card__listdate, .job-search-card__listdate--new').text().trim();
      
      const urn = card.attr('data-entity-urn') || '';
      const jobId = urn.split(':').pop() || '';

      jobs.push({
        jobId,
        title,
        company,
        location: jobLocation,
        link,
        logo,
        postDate,
        source: 'LinkedIn'
      });
    });

    res.json(jobs);
  } catch (error) {
    console.error('LinkedIn Scraper error:', error.message);
    res.status(500).json({ error: 'Failed to fetch jobs from LinkedIn', details: error.message });
  }
});

// ==========================================
// 3. File System Integration Routes
// ==========================================

// List files in workspace
router.get('/files', (req, res) => {
  try {
    fs.readdir(WORKSPACE_DIR, { withFileTypes: true }, (err, files) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to read workspace directory', details: err.message });
      }

      const fileList = files
        .filter(dirent => dirent.isFile())
        .map(dirent => {
          const ext = path.extname(dirent.name).toLowerCase();
          const stats = fs.statSync(path.join(WORKSPACE_DIR, dirent.name));
          
          return {
            name: dirent.name,
            extension: ext,
            size: stats.size,
            mtime: stats.mtime
          };
        })
        .filter(file => ['.md', '.txt', '.html', '.docx', '.pdf'].includes(file.extension));

      res.json(fileList);
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error listing files', details: error.message });
  }
});

// Get workspace file content (for .md, .txt, .html)
router.get('/files/content', (req, res) => {
  const fileName = req.query.name;
  if (!fileName) {
    return res.status(400).json({ error: 'File name parameter is required' });
  }

  const safeName = path.basename(fileName);
  const filePath = path.join(WORKSPACE_DIR, safeName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  const ext = path.extname(safeName).toLowerCase();
  
  if (!['.md', '.txt', '.html'].includes(ext)) {
    return res.status(400).json({ error: 'Only text, markdown and html files can be read directly' });
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    res.json({ name: safeName, extension: ext, content });
  } catch (err) {
    res.status(500).json({ error: 'Failed to read file content', details: err.message });
  }
});

// View/Stream files inline (PDFs, HTML, txt)
router.get('/files/view', (req, res) => {
  const fileName = req.query.name;
  if (!fileName) {
    return res.status(400).json({ error: 'File name parameter is required' });
  }

  const safeName = path.basename(fileName);
  const filePath = path.join(WORKSPACE_DIR, safeName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  const ext = path.extname(safeName).toLowerCase();
  let contentType = 'application/octet-stream';
  
  if (ext === '.pdf') {
    contentType = 'application/pdf';
  } else if (ext === '.html') {
    contentType = 'text/html';
  } else if (ext === '.txt') {
    contentType = 'text/plain';
  } else if (ext === '.md') {
    contentType = 'text/markdown';
  }

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
  res.sendFile(filePath);
});

module.exports = router;
