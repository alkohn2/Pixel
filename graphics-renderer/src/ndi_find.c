#include <stdio.h>
#include <stdbool.h>
#include <stdint.h>
#include <string.h>
#include <stdlib.h>

typedef void* NDIlib_find_instance_t;

typedef struct NDIlib_source_t {
    const char* p_ndi_name;
    const char* p_url_address;
} NDIlib_source_t;

typedef struct NDIlib_find_create_t {
    bool show_local_sources;
    const char* p_groups;
    const char* p_extra_ips;
} NDIlib_find_create_t;

bool NDIlib_initialize(void);
void NDIlib_destroy(void);
NDIlib_find_instance_t NDIlib_find_create_v2(const NDIlib_find_create_t* p_create_settings);
void NDIlib_find_destroy(NDIlib_find_instance_t p_instance);
bool NDIlib_find_wait_for_sources(NDIlib_find_instance_t p_instance, uint32_t timeout_ms);
const NDIlib_source_t* NDIlib_find_get_current_sources(NDIlib_find_instance_t p_instance, uint32_t* p_no_sources);

int main(int argc, char* argv[]) {
    const char* target = "PIXEL Graphics";
    bool jsonOutput = false;
    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "--json") == 0) {
            jsonOutput = true;
        } else if (argv[i][0] != '-') {
            target = argv[i];
        }
    }

    if (!NDIlib_initialize()) {
        if (jsonOutput) {
            printf("{\"success\":false,\"error\":\"NDIlib_initialize failed\"}\n");
        } else {
            fprintf(stderr, "Error: NDIlib_initialize failed\n");
        }
        return 2;
    }

    NDIlib_find_create_t find_settings;
    memset(&find_settings, 0, sizeof(find_settings));
    find_settings.show_local_sources = true;
    find_settings.p_groups = NULL;
    find_settings.p_extra_ips = NULL;

    NDIlib_find_instance_t pNDI_find = NDIlib_find_create_v2(&find_settings);
    if (!pNDI_find) {
        if (jsonOutput) {
            printf("{\"success\":false,\"error\":\"NDIlib_find_create_v2 failed\"}\n");
        } else {
            fprintf(stderr, "Error: NDIlib_find_create_v2 failed\n");
        }
        NDIlib_destroy();
        return 2;
    }

    uint32_t count = 0;
    bool found = false;
    char matchedName[256] = {0};
    char matchedUrl[256] = {0};

    // Wait up to 2.5 seconds (10 x 250ms) for discovery announcement
    for (int i = 0; i < 10; i++) {
        NDIlib_find_wait_for_sources(pNDI_find, 250);
        const NDIlib_source_t* p_sources = NDIlib_find_get_current_sources(pNDI_find, &count);
        for (uint32_t s = 0; s < count; s++) {
            if (p_sources[s].p_ndi_name && strstr(p_sources[s].p_ndi_name, target)) {
                found = true;
                strncpy(matchedName, p_sources[s].p_ndi_name, sizeof(matchedName) - 1);
                if (p_sources[s].p_url_address) {
                    strncpy(matchedUrl, p_sources[s].p_url_address, sizeof(matchedUrl) - 1);
                }
                break;
            }
        }
        if (found) break;
    }

    if (jsonOutput) {
        if (found) {
            printf("{\"success\":true,\"target\":\"%s\",\"matchedName\":\"%s\",\"url\":\"%s\",\"totalSources\":%u}\n",
                   target, matchedName, matchedUrl, count);
        } else {
            printf("{\"success\":false,\"target\":\"%s\",\"totalSources\":%u}\n", target, count);
        }
    } else {
        if (found) {
            printf("FOUND: %s (%s)\n", matchedName, matchedUrl);
        } else {
            printf("NOT_FOUND: '%s' (total sources discovered: %u)\n", target, count);
        }
    }

    NDIlib_find_destroy(pNDI_find);
    NDIlib_destroy();
    return found ? 0 : 1;
}
