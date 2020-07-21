module.exports = resize

function resize (srcImg, dstImg) {
  var srcData = srcImg.data
  var srcWidth = srcImg.width
  var srcHeight = srcImg.height
  var dstData = dstImg.data
  var dstWidth = dstImg.width
  var dstHeight = dstImg.height
  var filtersX = makeFilters(dstWidth, srcWidth)
  var filtersY = makeFilters(dstHeight, srcHeight)
  var tmpY = new Uint8ClampedArray(srcWidth * 3)
  var srcX, dstX, dstY, srcPixels, r, g, b, ip, pixel, srcP, dstP

  for (dstY = 0; dstY < dstHeight; dstY++) {
    // Convolve Y
    for (srcX = 0; srcX < srcWidth; srcX++) {
      srcPixels = filtersY[dstY]
      r = 0, g = 0, b = 0

      for (ip = 0; ip < srcPixels.length; ip++) {
        pixel = srcPixels[ip]
        srcP = (pixel.index * srcWidth + srcX) * 4
        r += pixel.weight * srcData[srcP]
        g += pixel.weight * srcData[srcP + 1]
        b += pixel.weight * srcData[srcP + 2]
      }

      tmpY[srcX * 3] = r
      tmpY[srcX * 3 + 1] = g
      tmpY[srcX * 3 + 2] = b
    }

    // Convolve X
    for (dstX = 0; dstX < dstWidth; dstX++) {
      srcPixels = filtersX[dstX]
      r = 0, g = 0, b = 0

      for (ip = 0; ip < srcPixels.length; ip++) {
        pixel = srcPixels[ip]
        srcP = pixel.index * 3
        r += pixel.weight * tmpY[srcP]
        g += pixel.weight * tmpY[srcP + 1]
        b += pixel.weight * tmpY[srcP + 2]
      }

      dstP = (dstY * dstWidth + dstX) * 4
      dstData[dstP] = r
      dstData[dstP + 1] = g
      dstData[dstP + 2] = b
      dstData[dstP + 3] = 255
    }
  }
}

function bicubic (x) {
  var a = -0.5
  if (x < 0) x = -x
  return (
    x <= 1 ? ((a + 2) * (x * x * x) - (a + 3) * (x * x) + 1) :
    x < 2 ? (a * (x * x * x) - 5 * a * (x * x) + 8 * a * x - 4 * a) : 0
  )
}

function makeFilters (dstSize, srcSize) {
  var filters = []
  var scale = dstSize / srcSize
  var scaleFactor = Math.min(scale, 1)
  var dst, srcCenter, srcPixels, firstPixel, lastPixel
  var totalWeight, sample, norm, dist, weight

  for (dst = 0; dst < dstSize; dst++) {
    srcPixels = []
    totalWeight = 0
    srcCenter = ((dst + 0.5) / scale) - 0.5
    firstPixel = Math.floor(srcCenter - 2)
    lastPixel = Math.ceil(srcCenter + 2)

    if (scale < 1) {
      firstPixel = Math.floor(srcCenter - 2 / scale)
      lastPixel = Math.ceil(srcCenter + 2 / scale)
    }

    for (sample = firstPixel; sample <= lastPixel; sample++) {
      dist = (srcCenter - sample) * scaleFactor
      totalWeight += bicubic(dist)
    }

    norm = 1 / totalWeight

    for (sample = firstPixel; sample <= lastPixel; sample++) {
      if ((dist = (srcCenter - sample) * scaleFactor) > 2) continue
      if (weight = bicubic(dist) * norm) srcPixels.push({
        index: Math.min(Math.max(sample, 0), srcSize - 1),
        weight: weight
      })
    }

    filters.push(srcPixels)
  }

  return filters
}
