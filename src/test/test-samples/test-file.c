#define A 1
#define B 1

// Off screen test
#ifdef A

#define MAX_OK(x , y)   \
 ((x) > (y)             \
 ? (x)                  \
 : (y))

#define MAX_ERR(x , y)  \
 ((x) > (y)             
 ? (x)                  \
 : (y)) 

int main() {
    int a,b;

// Depth test
#if defined A
    int a = 1;

// Middle keywords test
#ifdef A
    int a = 1;
#elif defined B
    int b = 2;
#else
    int b = 3;
#endif
    int a = 1;

#endif

    printf("MAX_OK: %d\n", MAX_OK(a, b));

  return 0;
}




































#endif