#ifndef Processing_NDI_Lib_h
#define Processing_NDI_Lib_h

#include <stdint.h>
#include <stdbool.h>

typedef void* NDIlib_send_instance_t;

typedef enum NDIlib_FourCC_video_type_e {
    NDIlib_FourCC_type_UYVY = 0x59565955,
    NDIlib_FourCC_video_type_UYVY = 0x59565955,
    NDIlib_FourCC_type_BGRA = 0x41524742,
    NDIlib_FourCC_video_type_BGRA = 0x41524742,
    NDIlib_FourCC_type_BGRX = 0x58524742,
    NDIlib_FourCC_video_type_BGRX = 0x58524742,
    NDIlib_FourCC_type_RGBA = 0x41424752,
    NDIlib_FourCC_video_type_RGBA = 0x41424752,
    NDIlib_FourCC_type_RGBX = 0x58424752,
    NDIlib_FourCC_video_type_RGBX = 0x58424752
} NDIlib_FourCC_video_type_e;

typedef enum NDIlib_frame_format_type_e {
    NDIlib_frame_format_type_progressive = 1,
    NDIlib_frame_format_type_interleaved = 2,
    NDIlib_frame_format_type_field_0 = 3,
    NDIlib_frame_format_type_field_1 = 4
} NDIlib_frame_format_type_e;

typedef struct NDIlib_send_create_t {
    const char* p_ndi_name;
    const char* p_groups;
    bool clock_video;
    bool clock_audio;
} NDIlib_send_create_t;

typedef struct NDIlib_video_frame_v2_t {
    int xres;
    int yres;
    NDIlib_FourCC_video_type_e FourCC;
    int frame_rate_N;
    int frame_rate_D;
    float picture_aspect_ratio;
    NDIlib_frame_format_type_e frame_format_type;
    int64_t timecode;
    uint8_t* p_data;
    int line_stride_in_bytes;
    const char* p_metadata;
    int64_t timestamp;
} NDIlib_video_frame_v2_t;

#ifdef __cplusplus
extern "C" {
#endif

bool NDIlib_initialize(void);
void NDIlib_destroy(void);
NDIlib_send_instance_t NDIlib_send_create(const NDIlib_send_create_t* p_create_settings);
void NDIlib_send_destroy(NDIlib_send_instance_t p_instance);
void NDIlib_send_send_video_v2(NDIlib_send_instance_t p_instance, const NDIlib_video_frame_v2_t* p_video_data);
void NDIlib_send_send_video_async_v2(NDIlib_send_instance_t p_instance, const NDIlib_video_frame_v2_t* p_video_data);
int NDIlib_send_get_no_connections(NDIlib_send_instance_t p_instance, uint32_t timeout_ms);

#ifdef __cplusplus
}
#endif

#endif
