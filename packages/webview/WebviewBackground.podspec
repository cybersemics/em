require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name = 'WebviewBackground'
  s.version = package['version']
  s.summary = package['description']
  s.license = package['license']
  s.homepage = package['repository']['url']
  s.author = package['author']
  s.source = { :git => package['repository']['url'], :tag => s.version.to_s }
  s.source_files = 'ios/Sources/**/*.{swift,h,m,c,cc,mm,cpp}'
  s.ios.deployment_target  = '13.0'
  # BrowserEngineKit (presentEditMenu) exists only on iOS 17.4 and later, so it is weak-linked to keep older devices launching.
  s.weak_frameworks = 'BrowserEngineKit'
  s.dependency 'Capacitor'
  s.swift_version = '5.1'
end
