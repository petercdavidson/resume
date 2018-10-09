// Created with Squiffy 5.0.0
// https://github.com/textadventures/squiffy

(function(){
/* jshint quotmark: single */
/* jshint evil: true */

var squiffy = {};

(function () {
    'use strict';

    squiffy.story = {};

    var initLinkHandler = function () {
        var handleLink = function (link) {
            if (link.hasClass('disabled')) return;
            var passage = link.data('passage');
            var section = link.data('section');
            var rotateAttr = link.attr('data-rotate');
            var sequenceAttr = link.attr('data-sequence');
            if (passage) {
                disableLink(link);
                squiffy.set('_turncount', squiffy.get('_turncount') + 1);
                passage = processLink(passage);
                if (passage) {
                    currentSection.append('<hr/>');
                    squiffy.story.passage(passage);
                }
                var turnPassage = '@' + squiffy.get('_turncount');
                if (turnPassage in squiffy.story.section.passages) {
                    squiffy.story.passage(turnPassage);
                }
            }
            else if (section) {
                currentSection.append('<hr/>');
                disableLink(link);
                section = processLink(section);
                squiffy.story.go(section);
            }
            else if (rotateAttr || sequenceAttr) {
                var result = rotate(rotateAttr || sequenceAttr, rotateAttr ? link.text() : '');
                link.html(result[0].replace(/&quot;/g, '"').replace(/&#39;/g, '\''));
                var dataAttribute = rotateAttr ? 'data-rotate' : 'data-sequence';
                link.attr(dataAttribute, result[1]);
                if (!result[1]) {
                    disableLink(link);
                }
                if (link.attr('data-attribute')) {
                    squiffy.set(link.attr('data-attribute'), result[0]);
                }
                squiffy.story.save();
            }
        };

        squiffy.ui.output.on('click', 'a.squiffy-link', function () {
            handleLink(jQuery(this));
        });

        squiffy.ui.output.on('keypress', 'a.squiffy-link', function (e) {
            if (e.which !== 13) return;
            handleLink(jQuery(this));
        });

        squiffy.ui.output.on('mousedown', 'a.squiffy-link', function (event) {
            event.preventDefault();
        });
    };

    var disableLink = function (link) {
        link.addClass('disabled');
        link.attr('tabindex', -1);
    }
    
    squiffy.story.begin = function () {
        if (!squiffy.story.load()) {
            squiffy.story.go(squiffy.story.start);
        }
    };

    var processLink = function(link) {
        var sections = link.split(',');
        var first = true;
        var target = null;
        sections.forEach(function (section) {
            section = section.trim();
            if (startsWith(section, '@replace ')) {
                replaceLabel(section.substring(9));
            }
            else {
                if (first) {
                    target = section;
                }
                else {
                    setAttribute(section);
                }
            }
            first = false;
        });
        return target;
    };

    var setAttribute = function(expr) {
        var lhs, rhs, op, value;
        var setRegex = /^([\w]*)\s*=\s*(.*)$/;
        var setMatch = setRegex.exec(expr);
        if (setMatch) {
            lhs = setMatch[1];
            rhs = setMatch[2];
            if (isNaN(rhs)) {
                squiffy.set(lhs, rhs);
            }
            else {
                squiffy.set(lhs, parseFloat(rhs));
            }
        }
        else {
            var incDecRegex = /^([\w]*)\s*([\+\-])=\s*(.*)$/;
            var incDecMatch = incDecRegex.exec(expr);
            if (incDecMatch) {
                lhs = incDecMatch[1];
                op = incDecMatch[2];
                rhs = parseFloat(incDecMatch[3]);
                value = squiffy.get(lhs);
                if (value === null) value = 0;
                if (op == '+') {
                    value += rhs;
                }
                if (op == '-') {
                    value -= rhs;
                }
                squiffy.set(lhs, value);
            }
            else {
                value = true;
                if (startsWith(expr, 'not ')) {
                    expr = expr.substring(4);
                    value = false;
                }
                squiffy.set(expr, value);
            }
        }
    };

    var replaceLabel = function(expr) {
        var regex = /^([\w]*)\s*=\s*(.*)$/;
        var match = regex.exec(expr);
        if (!match) return;
        var label = match[1];
        var text = match[2];
        if (text in squiffy.story.section.passages) {
            text = squiffy.story.section.passages[text].text;
        }
        else if (text in squiffy.story.sections) {
            text = squiffy.story.sections[text].text;
        }
        var stripParags = /^<p>(.*)<\/p>$/;
        var stripParagsMatch = stripParags.exec(text);
        if (stripParagsMatch) {
            text = stripParagsMatch[1];
        }
        var $labels = squiffy.ui.output.find('.squiffy-label-' + label);
        $labels.fadeOut(1000, function() {
            $labels.html(squiffy.ui.processText(text));
            $labels.fadeIn(1000, function() {
                squiffy.story.save();
            });
        });
    };

    squiffy.story.go = function(section) {
        squiffy.set('_transition', null);
        newSection();
        squiffy.story.section = squiffy.story.sections[section];
        if (!squiffy.story.section) return;
        squiffy.set('_section', section);
        setSeen(section);
        var master = squiffy.story.sections[''];
        if (master) {
            squiffy.story.run(master);
            squiffy.ui.write(master.text);
        }
        squiffy.story.run(squiffy.story.section);
        // The JS might have changed which section we're in
        if (squiffy.get('_section') == section) {
            squiffy.set('_turncount', 0);
            squiffy.ui.write(squiffy.story.section.text);
            squiffy.story.save();
        }
    };

    squiffy.story.run = function(section) {
        if (section.clear) {
            squiffy.ui.clearScreen();
        }
        if (section.attributes) {
            processAttributes(section.attributes);
        }
        if (section.js) {
            section.js();
        }
    };

    squiffy.story.passage = function(passageName) {
        var passage = squiffy.story.section.passages[passageName];
        if (!passage) return;
        setSeen(passageName);
        var masterSection = squiffy.story.sections[''];
        if (masterSection) {
            var masterPassage = masterSection.passages[''];
            if (masterPassage) {
                squiffy.story.run(masterPassage);
                squiffy.ui.write(masterPassage.text);
            }
        }
        var master = squiffy.story.section.passages[''];
        if (master) {
            squiffy.story.run(master);
            squiffy.ui.write(master.text);
        }
        squiffy.story.run(passage);
        squiffy.ui.write(passage.text);
        squiffy.story.save();
    };

    var processAttributes = function(attributes) {
        attributes.forEach(function (attribute) {
            if (startsWith(attribute, '@replace ')) {
                replaceLabel(attribute.substring(9));
            }
            else {
                setAttribute(attribute);
            }
        });
    };

    squiffy.story.restart = function() {
        if (squiffy.ui.settings.persist && window.localStorage) {
            var keys = Object.keys(localStorage);
            jQuery.each(keys, function (idx, key) {
                if (startsWith(key, squiffy.story.id)) {
                    localStorage.removeItem(key);
                }
            });
        }
        else {
            squiffy.storageFallback = {};
        }
        if (squiffy.ui.settings.scroll === 'element') {
            squiffy.ui.output.html('');
            squiffy.story.begin();
        }
        else {
            location.reload();
        }
    };

    squiffy.story.save = function() {
        squiffy.set('_output', squiffy.ui.output.html());
    };

    squiffy.story.load = function() {
        var output = squiffy.get('_output');
        if (!output) return false;
        squiffy.ui.output.html(output);
        currentSection = jQuery('#' + squiffy.get('_output-section'));
        squiffy.story.section = squiffy.story.sections[squiffy.get('_section')];
        var transition = squiffy.get('_transition');
        if (transition) {
            eval('(' + transition + ')()');
        }
        return true;
    };

    var setSeen = function(sectionName) {
        var seenSections = squiffy.get('_seen_sections');
        if (!seenSections) seenSections = [];
        if (seenSections.indexOf(sectionName) == -1) {
            seenSections.push(sectionName);
            squiffy.set('_seen_sections', seenSections);
        }
    };

    squiffy.story.seen = function(sectionName) {
        var seenSections = squiffy.get('_seen_sections');
        if (!seenSections) return false;
        return (seenSections.indexOf(sectionName) > -1);
    };
    
    squiffy.ui = {};

    var currentSection = null;
    var screenIsClear = true;
    var scrollPosition = 0;

    var newSection = function() {
        if (currentSection) {
            disableLink(jQuery('.squiffy-link', currentSection));
        }
        var sectionCount = squiffy.get('_section-count') + 1;
        squiffy.set('_section-count', sectionCount);
        var id = 'squiffy-section-' + sectionCount;
        currentSection = jQuery('<div/>', {
            id: id,
        }).appendTo(squiffy.ui.output);
        squiffy.set('_output-section', id);
    };

    squiffy.ui.write = function(text) {
        screenIsClear = false;
        scrollPosition = squiffy.ui.output.height();
        currentSection.append(jQuery('<div/>').html(squiffy.ui.processText(text)));
        squiffy.ui.scrollToEnd();
    };

    squiffy.ui.clearScreen = function() {
        squiffy.ui.output.html('');
        screenIsClear = true;
        newSection();
    };

    squiffy.ui.scrollToEnd = function() {
        var scrollTo, currentScrollTop, distance, duration;
        if (squiffy.ui.settings.scroll === 'element') {
            scrollTo = squiffy.ui.output[0].scrollHeight - squiffy.ui.output.height();
            currentScrollTop = squiffy.ui.output.scrollTop();
            if (scrollTo > currentScrollTop) {
                distance = scrollTo - currentScrollTop;
                duration = distance / 0.4;
                squiffy.ui.output.stop().animate({ scrollTop: scrollTo }, duration);
            }
        }
        else {
            scrollTo = scrollPosition;
            currentScrollTop = Math.max(jQuery('body').scrollTop(), jQuery('html').scrollTop());
            if (scrollTo > currentScrollTop) {
                var maxScrollTop = jQuery(document).height() - jQuery(window).height();
                if (scrollTo > maxScrollTop) scrollTo = maxScrollTop;
                distance = scrollTo - currentScrollTop;
                duration = distance / 0.5;
                jQuery('body,html').stop().animate({ scrollTop: scrollTo }, duration);
            }
        }
    };

    squiffy.ui.processText = function(text) {
        function process(text, data) {
            var containsUnprocessedSection = false;
            var open = text.indexOf('{');
            var close;
            
            if (open > -1) {
                var nestCount = 1;
                var searchStart = open + 1;
                var finished = false;
             
                while (!finished) {
                    var nextOpen = text.indexOf('{', searchStart);
                    var nextClose = text.indexOf('}', searchStart);
         
                    if (nextClose > -1) {
                        if (nextOpen > -1 && nextOpen < nextClose) {
                            nestCount++;
                            searchStart = nextOpen + 1;
                        }
                        else {
                            nestCount--;
                            searchStart = nextClose + 1;
                            if (nestCount === 0) {
                                close = nextClose;
                                containsUnprocessedSection = true;
                                finished = true;
                            }
                        }
                    }
                    else {
                        finished = true;
                    }
                }
            }
            
            if (containsUnprocessedSection) {
                var section = text.substring(open + 1, close);
                var value = processTextCommand(section, data);
                text = text.substring(0, open) + value + process(text.substring(close + 1), data);
            }
            
            return (text);
        }

        function processTextCommand(text, data) {
            if (startsWith(text, 'if ')) {
                return processTextCommand_If(text, data);
            }
            else if (startsWith(text, 'else:')) {
                return processTextCommand_Else(text, data);
            }
            else if (startsWith(text, 'label:')) {
                return processTextCommand_Label(text, data);
            }
            else if (/^rotate[: ]/.test(text)) {
                return processTextCommand_Rotate('rotate', text, data);
            }
            else if (/^sequence[: ]/.test(text)) {
                return processTextCommand_Rotate('sequence', text, data);   
            }
            else if (text in squiffy.story.section.passages) {
                return process(squiffy.story.section.passages[text].text, data);
            }
            else if (text in squiffy.story.sections) {
                return process(squiffy.story.sections[text].text, data);
            }
            return squiffy.get(text);
        }

        function processTextCommand_If(section, data) {
            var command = section.substring(3);
            var colon = command.indexOf(':');
            if (colon == -1) {
                return ('{if ' + command + '}');
            }

            var text = command.substring(colon + 1);
            var condition = command.substring(0, colon);

            var operatorRegex = /([\w ]*)(=|&lt;=|&gt;=|&lt;&gt;|&lt;|&gt;)(.*)/;
            var match = operatorRegex.exec(condition);

            var result = false;

            if (match) {
                var lhs = squiffy.get(match[1]);
                var op = match[2];
                var rhs = match[3];

                if (op == '=' && lhs == rhs) result = true;
                if (op == '&lt;&gt;' && lhs != rhs) result = true;
                if (op == '&gt;' && lhs > rhs) result = true;
                if (op == '&lt;' && lhs < rhs) result = true;
                if (op == '&gt;=' && lhs >= rhs) result = true;
                if (op == '&lt;=' && lhs <= rhs) result = true;
            }
            else {
                var checkValue = true;
                if (startsWith(condition, 'not ')) {
                    condition = condition.substring(4);
                    checkValue = false;
                }

                if (startsWith(condition, 'seen ')) {
                    result = (squiffy.story.seen(condition.substring(5)) == checkValue);
                }
                else {
                    var value = squiffy.get(condition);
                    if (value === null) value = false;
                    result = (value == checkValue);
                }
            }

            var textResult = result ? process(text, data) : '';

            data.lastIf = result;
            return textResult;
        }

        function processTextCommand_Else(section, data) {
            if (!('lastIf' in data) || data.lastIf) return '';
            var text = section.substring(5);
            return process(text, data);
        }

        function processTextCommand_Label(section, data) {
            var command = section.substring(6);
            var eq = command.indexOf('=');
            if (eq == -1) {
                return ('{label:' + command + '}');
            }

            var text = command.substring(eq + 1);
            var label = command.substring(0, eq);

            return '<span class="squiffy-label-' + label + '">' + process(text, data) + '</span>';
        }

        function processTextCommand_Rotate(type, section, data) {
            var options;
            var attribute = '';
            if (section.substring(type.length, type.length + 1) == ' ') {
                var colon = section.indexOf(':');
                if (colon == -1) {
                    return '{' + section + '}';
                }
                options = section.substring(colon + 1);
                attribute = section.substring(type.length + 1, colon);
            }
            else {
                options = section.substring(type.length + 1);
            }
            var rotation = rotate(options.replace(/"/g, '&quot;').replace(/'/g, '&#39;'));
            if (attribute) {
                squiffy.set(attribute, rotation[0]);
            }
            return '<a class="squiffy-link" data-' + type + '="' + rotation[1] + '" data-attribute="' + attribute + '" role="link">' + rotation[0] + '</a>';
        }

        var data = {
            fulltext: text
        };
        return process(text, data);
    };

    squiffy.ui.transition = function(f) {
        squiffy.set('_transition', f.toString());
        f();
    };

    squiffy.storageFallback = {};

    squiffy.set = function(attribute, value) {
        if (typeof value === 'undefined') value = true;
        if (squiffy.ui.settings.persist && window.localStorage) {
            localStorage[squiffy.story.id + '-' + attribute] = JSON.stringify(value);
        }
        else {
            squiffy.storageFallback[attribute] = JSON.stringify(value);
        }
        squiffy.ui.settings.onSet(attribute, value);
    };

    squiffy.get = function(attribute) {
        var result;
        if (squiffy.ui.settings.persist && window.localStorage) {
            result = localStorage[squiffy.story.id + '-' + attribute];
        }
        else {
            result = squiffy.storageFallback[attribute];
        }
        if (!result) return null;
        return JSON.parse(result);
    };

    var startsWith = function(string, prefix) {
        return string.substring(0, prefix.length) === prefix;
    };

    var rotate = function(options, current) {
        var colon = options.indexOf(':');
        if (colon == -1) {
            return [options, current];
        }
        var next = options.substring(0, colon);
        var remaining = options.substring(colon + 1);
        if (current) remaining += ':' + current;
        return [next, remaining];
    };

    var methods = {
        init: function (options) {
            var settings = jQuery.extend({
                scroll: 'body',
                persist: true,
                restartPrompt: true,
                onSet: function (attribute, value) {}
            }, options);

            squiffy.ui.output = this;
            squiffy.ui.restart = jQuery(settings.restart);
            squiffy.ui.settings = settings;

            if (settings.scroll === 'element') {
                squiffy.ui.output.css('overflow-y', 'auto');
            }

            initLinkHandler();
            squiffy.story.begin();
            
            return this;
        },
        get: function (attribute) {
            return squiffy.get(attribute);
        },
        set: function (attribute, value) {
            squiffy.set(attribute, value);
        },
        restart: function () {
            if (!squiffy.ui.settings.restartPrompt || confirm('Are you sure you want to restart?')) {
                squiffy.story.restart();
            }
        }
    };

    jQuery.fn.squiffy = function (methodOrOptions) {
        if (methods[methodOrOptions]) {
            return methods[methodOrOptions]
                .apply(this, Array.prototype.slice.call(arguments, 1));
        }
        else if (typeof methodOrOptions === 'object' || ! methodOrOptions) {
            return methods.init.apply(this, arguments);
        } else {
            jQuery.error('Method ' +  methodOrOptions + ' does not exist');
        }
    };
})();

var get = squiffy.get;
var set = squiffy.set;


squiffy.story.start = 'MAIN';
squiffy.story.id = '093120f6dd';
squiffy.story.sections = {
	'': {
		'clear': true,
		'text': "",
		'passages': {
		},
	},
	'Warning': {
		'text': "<p>NOTE: This resume is a work in progress and is not meant to be shared yet.</p>\n<p><a class=\"squiffy-link link-section\" data-section=\"MAIN\" role=\"link\" tabindex=\"0\">Continue</a></p>",
		'passages': {
		},
	},
	'MAIN': {
		'text': "<p><br><h2 align=\"center\">Peter C. Davidson – Resume </h2><br>\n<em>Pick a section below:</em><br></p>\n<h3 id=\"-a-class-squiffy-link-link-section-data-section-we-role-link-tabindex-0-work-experience-a-\"><a class=\"squiffy-link link-section\" data-section=\"WE\" role=\"link\" tabindex=\"0\">Work Experience</a></h3>\n<h3 id=\"-a-class-squiffy-link-link-section-data-section-edu-role-link-tabindex-0-education-a-\"><a class=\"squiffy-link link-section\" data-section=\"EDU\" role=\"link\" tabindex=\"0\">Education</a></h3>\n<h3 id=\"-portfolio-https-www-petercdavidson-com-\"><a href=\"https://www.petercdavidson.com/\">Portfolio</a></h3>\n<h3 id=\"-about-https-www-petercdavidson-com-about-\"><a href=\"https://www.petercdavidson.com/about/\">About</a></h3>",
		'passages': {
		},
	},
	'WE': {
		'text': "<p><p align=\"right\">Peter C. Davidson — Resume</p><hr></p>\n<h3 id=\"work-experience-br-\">Work Experience<br></h3>\n<p><em>Click a job to learn more.</em><br></p>\n<h4 id=\"-a-class-squiffy-link-link-section-data-section-we-hfm-d-role-link-tabindex-0-video-production-specialist-a-\"><a class=\"squiffy-link link-section\" data-section=\"WE HFM D\" role=\"link\" tabindex=\"0\">Video Production Specialist</a></h4>\n<p>Happy Fox Media - Orem, UT<br>\n<em>Jan 2014 - Present</em><br></p>\n<h4 id=\"-a-class-squiffy-link-link-section-data-section-we-mps-d-role-link-tabindex-0-vfx-coordinator-a-\"><a class=\"squiffy-link link-section\" data-section=\"WE MPS D\" role=\"link\" tabindex=\"0\">VFX Coordinator</a></h4>\n<p>LDS Motion Picture Studio (mpsVFX) - Provo, UT<br>\n<em>Jan 2018 - Sep 2018</em><br></p>\n<h4 id=\"-a-class-squiffy-link-link-section-data-section-we-mbao-d-role-link-tabindex-0-video-editor-a-\"><a class=\"squiffy-link link-section\" data-section=\"WE MBAO D\" role=\"link\" tabindex=\"0\">Video Editor</a></h4>\n<p>University of Utah MBA Online Program - Salt Lake City, UT<br>\n<em>Mar 2014 - May 2016</em><br></p>\n<h4 id=\"-a-class-squiffy-link-link-section-data-section-we-bb-d-role-link-tabindex-0-teaching-assistant-a-\"><a class=\"squiffy-link link-section\" data-section=\"WE BB D\" role=\"link\" tabindex=\"0\">Teaching Assistant</a></h4>\n<p>University of Utah - David Eccles School of Business - Salt Lake City, UT<br>\n<em>Aug 2013 - Feb 2014</em><br></p>\n<h4 id=\"-a-class-squiffy-link-link-section-data-section-we-pmi-d-role-link-tabindex-0-private-music-instructor-a-\"><a class=\"squiffy-link link-section\" data-section=\"WE PMI D\" role=\"link\" tabindex=\"0\">Private Music Instructor</a></h4>\n<p>Private Studio - Salt Lake City, UT<br>\n<em>2008 - 2015</em><br><br><br>\n<a class=\"squiffy-link link-section\" data-section=\"MAIN\" role=\"link\" tabindex=\"0\">← Peter C. Davidson - Resume</a></p>",
		'passages': {
		},
	},
	'WE HFM D': {
		'text': "<p><p align=\"right\">Peter C. Davidson — Resume</p><hr></p>\n<h3 id=\"work-experience-br-\">Work Experience<br></h3>\n<h4 id=\"video-production-specialist\">Video Production Specialist</h4>\n<p>Happy Fox Media - Orem, UT<br>\n<em>Jan 2014 - Present</em><br><br>\n<strong>Details:</strong><br></p>\n<ul>\n<li>Create videos for marketing, social media, and e-learning applications (over 300 videos so far)</li>\n<li>Perform numerous roles including editing, video/sound capture, visual effects, writing, and animation</li>\n<li>Assure that clients are satisfied and their video needs are met (see happyfoxmedia.com/testimonials)</li>\n<li>Manage company web presence, finances, data, and equipment</li>\n<li>Collaborate with clients and other video editors to meet short deadlines</li>\n</ul>\n<p><br></p>\n<p><strong><a class=\"squiffy-link link-section\" data-section=\"WE HFM S\" role=\"link\" tabindex=\"0\">Read a summary</a></strong><br><br><br>\n<a class=\"squiffy-link link-section\" data-section=\"WE\" role=\"link\" tabindex=\"0\">← Work Experience</a></p>",
		'passages': {
		},
	},
	'WE HFM S': {
		'text': "<p><p align=\"right\">Peter C. Davidson — Resume</p><hr></p>\n<h3 id=\"work-experience-br-\">Work Experience<br></h3>\n<h4 id=\"video-production-specialist-br-\">Video Production Specialist<br></h4>\n<p>Happy Fox Media - Orem, UT<br>\n<em>Jan 2014 - Present</em><br><br>\n<strong>Summary:</strong><br></p>\n<ul>\n<li>Most of my video work over the last 5 years has been at Happy Fox Media, my video production company. As owner of the business, I&#39;ve created hundreds of videos for our clients and have gained extensive experience in writing, planning, shooting, editing, and visual effects. I&#39;ve worked with crew, talent, and clients to make sure projects are completed on time, within budget, and at the highest quality possible. Through managing the details of the business as well as client relationships, I have developed a strong attention to detail and have learned to communicate well and solve problems in high-stress situations.</li>\n</ul>\n<p><br></p>\n<p><strong><a class=\"squiffy-link link-section\" data-section=\"WE HFM D\" role=\"link\" tabindex=\"0\">View details</a></strong><br><br><br>\n<a class=\"squiffy-link link-section\" data-section=\"WE\" role=\"link\" tabindex=\"0\">← Work Experience</a></p>",
		'passages': {
		},
	},
	'WE MPS D': {
		'text': "<p><p align=\"right\">Peter C. Davidson — Resume</p><hr></p>\n<h3 id=\"work-experience-br-\">Work Experience<br></h3>\n<h4 id=\"vfx-coordinator-br-\">VFX Coordinator<br></h4>\n<p>LDS Motion Picture Studio (mpsVFX) - Provo, UT<br>\n<em>Jan 2018 - Sep 2018</em><br><br>\n<strong>Details:</strong><br></p>\n<ul>\n<li>Composited visual effects shots using Adobe After Effects</li>\n<li>Built custom tools to track and report employee hours, project cleanup status, and other project analytics</li>\n<li>Assisted leaders with bidding, budgeting, and marketing</li>\n<li>Managed and scheduled dailies (regular reviews of shots in progress)</li>\n<li>Facilitated communication between producer, supervisors, and artists</li>\n<li>Took revision notes during dailies and delivered to artists and supervisors</li>\n<li>Used Shotgun to track shot notes and revision history</li>\n<li>Tracked and reported employee time per project</li>\n<li>Performed pipeline tasks such as pulling plates and delivering completed shots</li>\n<li>Assisted in development of training materials for new artists</li>\n<li>Designed documents for bidding new projects</li>\n</ul>\n<p><br></p>\n<p><strong><a class=\"squiffy-link link-section\" data-section=\"WE MPS S\" role=\"link\" tabindex=\"0\">Read a summary</a></strong><br><br><br>\n<a class=\"squiffy-link link-section\" data-section=\"WE\" role=\"link\" tabindex=\"0\">← Work Experience</a></p>",
		'passages': {
		},
	},
	'WE MPS S': {
		'text': "<p><p align=\"right\">Peter C. Davidson — Resume</p><hr></p>\n<h3 id=\"work-experience-br-\">Work Experience<br></h3>\n<h4 id=\"vfx-coordinator-br-\">VFX Coordinator<br></h4>\n<p>LDS Motion Picture Studio (mpsVFX) - Provo, UT<br>\n<em>Jan 2018 - Sep 2018</em><br><br>\n<strong>Summary:</strong><br></p>\n<ul>\n<li>When I started working in the VFX department at the LDS Motion Picture Studio, the department was struggling to keep track of hours worked between various projects— employees were required to report their time though several different platforms, and no system existed to track and analyze the data as a whole. During my time as VFX Coordinator, I built a custom cloud-based time-tracking and project-reporting tool with the ability to generate custom reports and aggregate multiple projects. My system gave producers and supervisors access to detailed information that was previously inaccessible, resulting in improved communication and time management.</li>\n</ul>\n<p><br></p>\n<p><strong><a class=\"squiffy-link link-section\" data-section=\"WE MPS D\" role=\"link\" tabindex=\"0\">View details</a></strong><br><br><br>\n<a class=\"squiffy-link link-section\" data-section=\"WE\" role=\"link\" tabindex=\"0\">← Work Experience</a></p>",
		'passages': {
		},
	},
	'WE MBAO D': {
		'text': "<p><p align=\"right\">Peter C. Davidson — Resume</p><hr></p>\n<h3 id=\"work-experience-br-\">Work Experience<br></h3>\n<h4 id=\"video-editor-br-\">Video Editor<br></h4>\n<p>University of Utah MBA Online Program - Salt Lake City, UT<br>\n<em>Mar 2014 - May 2016</em><br><br>\n<strong>Details:</strong><br></p>\n<ul>\n<li>Captured and edited video lessons for delivery in MBA Online course</li>\n<li>Helped establish video workflow and editing standards for the U of U&#39;s MBA Online program, ranked #14 worldwide by The Princeton Review</li>\n<li>Trained other editors on video editing, camera operation, file management, etc.</li>\n<li>Design and creation of motion graphics elements</li>\n<li>Established best practices for file management, backup, and multi-user collaboration</li>\n<li>Directed video shoots with multiple cameras, lighting, and sound capture</li>\n<li>Wrote and animated a commercial for distribution on Pandora</li>\n</ul>\n<p><br></p>\n<p><strong><a class=\"squiffy-link link-section\" data-section=\"WE MBAO S\" role=\"link\" tabindex=\"0\">Read a summary</a></strong><br><br><br>\n<a class=\"squiffy-link link-section\" data-section=\"WE\" role=\"link\" tabindex=\"0\">← Work Experience</a></p>",
		'passages': {
		},
	},
	'WE MBAO S': {
		'text': "<p><p align=\"right\">Peter C. Davidson — Resume</p><hr></p>\n<h3 id=\"work-experience-br-\">Work Experience<br></h3>\n<h4 id=\"video-editor-br-\">Video Editor<br></h4>\n<p>University of Utah MBA Online Program - Salt Lake City, UT<br>\n<em>Mar 2014 - May 2016</em><br><br>\n<strong>Summary:</strong><br></p>\n<ul>\n<li>When I started working at the newly-created MBA Online program at the University of Utah, the program was grappling with the unique challenge of producing large amounts of e-learning content while working mostly with part-time student video editors. I developed and implemented a video editing workflow that allowed projects to be edited by multiple editors from different computers, while still providing security and real-time cloud backups. This system allowed the program to grow quickly and hire more video editors without having to restructure their workflow, resulting in increased video output. Today, the MBA Online program is ranked #14 worldwide by the Princeton Review.</li>\n</ul>\n<p><br></p>\n<p><strong><a class=\"squiffy-link link-section\" data-section=\"WE MBAO D\" role=\"link\" tabindex=\"0\">View details</a></strong><br><br><br>\n<a class=\"squiffy-link link-section\" data-section=\"WE\" role=\"link\" tabindex=\"0\">← Work Experience</a></p>",
		'passages': {
		},
	},
	'WE BB D': {
		'text': "<p><p align=\"right\">Peter C. Davidson — Resume</p><hr></p>\n<h3 id=\"work-experience-br-\">Work Experience<br></h3>\n<h4 id=\"teaching-assistant-br-\">Teaching Assistant<br></h4>\n<p>University of Utah - David Eccles School of Business - Salt Lake City, UT<br>\n<em>Aug 2013 - Feb 2014</em><br><br>\n<strong>Details:</strong><br></p>\n<ul>\n<li>Worked with professors and other faculty to create whiteboard animations teaching key concepts in entrepreneurship</li>\n<li>Recorded and edited video of lectures for online delivery</li>\n<li>Created an animation on economic development that was shown before the Utah Legislature</li>\n<li>Operated a video switcher to capture live, multi-camera video and audio of classroom lectures</li>\n</ul>\n<p><br></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"WE\" role=\"link\" tabindex=\"0\">← Work Experience</a></p>",
		'passages': {
		},
	},
	'WE PMI D': {
		'text': "<p><p align=\"right\">Peter C. Davidson — Resume</p><hr></p>\n<h3 id=\"work-experience-br-\">Work Experience<br></h3>\n<h4 id=\"private-music-instructor-br-\">Private Music Instructor<br></h4>\n<p>Private Studio - Salt Lake City, UT<br>\n<em>2008 - Nov 2015</em><br><br>\n<strong>Details:</strong><br></p>\n<ul>\n<li>Taught private piano and guitar lessons to students from 5 to 14 years old</li>\n<li>Prepared two guitar students to audition for the prestigious Wasatch Junior High Jazz Band in Salt Lake City; both were accepted into the band as seventh graders the first year they auditioned</li>\n</ul>\n<p><br></p>\n<p><a class=\"squiffy-link link-section\" data-section=\"WE\" role=\"link\" tabindex=\"0\">← Work Experience</a></p>",
		'passages': {
		},
	},
	'EDU': {
		'text': "<p><p align=\"right\">Peter C. Davidson — Resume</p><hr></p>\n<h3 id=\"education-br-\">Education<br></h3>\n<h4 id=\"-a-class-squiffy-link-link-section-data-section-edu-uu-d-role-link-tabindex-0-the-university-of-utah-a-br-\"><a class=\"squiffy-link link-section\" data-section=\"EDU UU D\" role=\"link\" tabindex=\"0\">The University of Utah</a><br></h4>\n<p>Bachelor&#39;s - Film and Media Arts<br>\n<em>Graduated Spring 2017 - Salt Lake City, UT</em><br><br></p>\n<h4 id=\"skyline-high-school-br-\">Skyline High School<br></h4>\n<p><em>Graduated Spring 2010 - Millcreek, UT</em><br><br><br>\n<a class=\"squiffy-link link-section\" data-section=\"MAIN\" role=\"link\" tabindex=\"0\">← Peter C. Davidson - Resume</a></p>",
		'passages': {
		},
	},
	'EDU UU D': {
		'text': "<p><p align=\"right\">Peter C. Davidson — Resume</p><hr></p>\n<h3 id=\"education-br-\">Education<br></h3>\n<h4 id=\"the-university-of-utah-br-\">The University of Utah<br></h4>\n<p>Bachelor&#39;s - Film and Media Arts<br>\n<em>Graduated Spring 2017</em><br><br>\n<strong>Details:</strong><br></p>\n<ul>\n<li><strong>Degree:</strong> Honors Bachelor of Arts (HBA)</li>\n<li><strong>Major:</strong> Film and Media Arts<ul>\n<li><strong>Major GPA:</strong> 4.0</li>\n</ul>\n</li>\n<li><strong>Minor:</strong> Spanish</li>\n<li><strong>Cumulative GPA:</strong> 3.92 (Cum Laude honors)</li>\n</ul>\n<p><br></p>\n<p><strong><a class=\"squiffy-link link-section\" data-section=\"EDU UU SF\" role=\"link\" tabindex=\"0\">View short films</a></strong><br><br><br>\n<a class=\"squiffy-link link-section\" data-section=\"EDU\" role=\"link\" tabindex=\"0\">← Education</a></p>",
		'passages': {
		},
	},
	'EDU UU SF': {
		'text': "<p><p align=\"right\">Peter C. Davidson — Resume</p><hr></p>\n<h3 id=\"education-br-\">Education<br></h3>\n<h4 id=\"the-university-of-utah-br-\">The University of Utah<br></h4>\n<p>Bachelor&#39;s - Film and Media Arts<br>\n<em>Graduated Spring 2017</em><br><br>\n<strong>Short Films created at the University of Utah:</strong><br></p>\n<ul>\n<li><a href=\"https://www.petercdavidson.com/film/the-disintegration-machine\">The Disintegration Machine</a> (2017)</li>\n<li><a href=\"https://www.petercdavidson.com/film/diegos-dream\">Diego&#39;s Dream</a> (2016)</li>\n<li><a href=\"https://www.petercdavidson.com/film/the-timekeeper\">The Timekeeper</a> (2015)</li>\n<li><a href=\"https://www.petercdavidson.com/film/writers-block\">Writer&#39;s Block</a> (2015)</li>\n<li><a href=\"https://www.petercdavidson.com/film/the-eye-of-a-needle\">The Eye of a Needle</a> (2011)</li>\n<li><a href=\"https://www.petercdavidson.com/film/alter-ego\">Alter Ego</a> (2011)</li>\n</ul>\n<p><br></p>\n<p><strong><a class=\"squiffy-link link-section\" data-section=\"EDU UU D\" role=\"link\" tabindex=\"0\">View details</a></strong><br><br><br>\n<a class=\"squiffy-link link-section\" data-section=\"EDU\" role=\"link\" tabindex=\"0\">← Education</a></p>",
		'passages': {
		},
	},
}
})();