#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>

#include "uselibpng.h"

static const char key_word_png[] = "png";
static const char key_word_color[] = "color 4";
static const char key_word_position[] = "position 2";
static const char key_word_drawPixels[] = "drawPixels";

typedef struct {
    int length;
    int *items;
} list_item;

typedef struct {
    int colors_length;
    int positions_length;
    list_item *colors;
    list_item *positions;
} pixel_metadata;

bool prefix(const char *pre, const char *str) {
    return strncmp(pre, str, strlen(pre)) == 0;
}

void add_token(char ***dest, int *current_size, const char *new_token) {
    char **temp = realloc(*dest, (*current_size + 1) * sizeof(char *));

    if (temp == NULL) {
        printf("Memory allocation failed!\n");
        exit(1);
    }

    *dest = temp;

    (*dest)[*current_size] = malloc((strlen(new_token) + 1) * sizeof(char));

    if ((*dest)[*current_size] == NULL) {
        printf("Memory allocation for string failed!\n");
        exit(1);
    }

    strcpy((*dest)[*current_size], new_token);
    (*current_size)++;
}

void tokenize_line(char ***tokens, int *token_count, const char *line, const size_t start_pos, const int line_length) {
    int current_pos = start_pos;
    while (current_pos < line_length) {
        int non_space_length = 0;
        while(!isspace(line[current_pos]) && line[current_pos] != '\0') {
            non_space_length++;
            current_pos++;
        }

        if (non_space_length > 0) {
            char token[non_space_length + 1];
            int c = 0;
            while (c < non_space_length) {
                token[c] = line[current_pos - non_space_length + c];
                c++;
            }
            // terminate
            token[c] = '\0';

            add_token(tokens, token_count, token);
        } else {
            current_pos++;
        }
    }
}

void free_tokens(char **arr, const int size) {
    for (int i = 0; i < size; i++) {
        free(arr[i]);
    }
    free(arr);
}

void free_pixels(pixel_metadata *pixels) {
    for (int i = 0; i < pixels->positions_length; i++) {
        free(pixels->positions[i].items);
    }
    free(pixels->positions);

    for (int i = 0; i < pixels->colors_length; i++) {
        free(pixels->colors[i].items);
    }
    free(pixels->colors);

    free(pixels);
}

bool string_is_number(const char *str) {
    for (int i = 0; i < strlen(str); i++) {
        if (!isdigit(str[i])) {
            return false;
        }
    }

    return true;
}

int main(int argc, const char **argv) {
    if (argc != 2) {
        perror("Usage: main file=...\n");
        return 1;
    }
    int file_name_index = argc - 1;
    const char *file_name = argv[file_name_index];
    printf("file name: %s\n", file_name);

    FILE *file = fopen(file_name, "r");
    if (file == NULL) {
        perror("Error opening file");
        return 1;
    }

    char *line = NULL;
    size_t line_length = 0;
    char *filename = NULL;

    // assume only 2D for now and we won't get more than 2 numbers in the subsequent tokenize call
    int dimensions[2];
    int n = 0;

    pixel_metadata *pixels = malloc(sizeof(pixel_metadata));
    pixels->colors_length = 0;
    pixels->positions_length = 0;

    //too much of a hassle to resize these right now, go big or go home
    pixels->colors = (list_item*) malloc(2048 * sizeof(int) + sizeof(int));
    pixels->positions = (list_item*) malloc(2048 * sizeof(int) + sizeof(int));

    while (getline(&line, &line_length, file) != -1) {
        if (prefix(key_word_png, line)) {
            // may be an edge case where every character ends up in its own column in which this doesn't compensate
            // for the extra null terminator
            char **tokens = malloc(1 * sizeof(char *));
            int token_count = 0;
            tokenize_line(&tokens, &token_count, line, strlen(key_word_png), line_length);

            // it's hack, don't judge me
            int num_count = 0;

            for (int i = 0; i < token_count; i++) {
                if (string_is_number(tokens[i])) {
                    dimensions[num_count] = atoi(tokens[i]);
                    num_count++;
                }
                filename = malloc(strlen(tokens[i]) + 1);
                strcpy(filename, tokens[i]);
            }

            free_tokens(tokens, token_count);
        } else if (prefix(key_word_color, line)) {
            char **tokens = malloc(1 * sizeof(char *));
            int token_count = 0;
            tokenize_line(&tokens, &token_count, line, strlen(key_word_color), line_length);

            pixels->colors[pixels->colors_length].items = malloc(token_count * sizeof(int));
            pixels->colors[pixels->colors_length].length = token_count;
            for (int i = 0; i < token_count; i++) {
                pixels->colors[pixels->colors_length].items[i] = atoi(tokens[i]);
            }
            pixels->colors_length += 1;

            free_tokens(tokens, token_count);
        } else if (prefix(key_word_position, line)) {
            char **tokens = malloc(1 * sizeof(char *));
            int token_count = 0;
            tokenize_line(&tokens, &token_count, line, strlen(key_word_position), line_length);

            pixels->positions[pixels->positions_length].items = malloc(token_count * sizeof(int));
            pixels->positions[pixels->positions_length].length = token_count;
            for (int i = 0; i < token_count; i++) {
                pixels->positions[pixels->positions_length].items[i] = atoi(tokens[i]);
            }
            pixels->positions_length += 1;

            free_tokens(tokens, token_count);
        } else if (prefix(key_word_drawPixels, line)) {
            char **tokens = malloc(1 * sizeof(char *));
            int token_count = 0;
            tokenize_line(&tokens, &token_count, line, strlen(key_word_drawPixels), line_length);

            n = atoi(tokens[0]);

            free_tokens(tokens, token_count);
        }
    }

    fclose(file);

    image_t *img = new_image(dimensions[0], dimensions[1]);

    // it's not worth comparing positions_length and colors_length check to determine
    // which colors should go with which positions since I validate literally nothing else,
    // so I'll assume there can be more than 1 position line, but only 1 color line
    for (int j = 0; j < pixels->positions_length; j++) {
        for (int k = 0; k < n*2; k += 2) {
            const int x = pixels->positions[j].items[k];
            const int y = pixels->positions[j].items[k+1];
            const int red = pixels->colors[0].items[k * 2];
            const int green = pixels->colors[0].items[k * 2 + 1];
            const int blue = pixels->colors[0].items[k * 2 + 2];
            const int alpha = pixels->colors[0].items[k * 2 + 3];

            pixel_xy(img, x, y).red = red;
            pixel_xy(img, x, y).green = green;
            pixel_xy(img, x, y).blue = blue;
            pixel_xy(img, x, y).alpha = alpha;
        }
    }

    save_image(img, filename);
    free_image(img);

    free_pixels(pixels);
    free(filename);

    return 0;
}
